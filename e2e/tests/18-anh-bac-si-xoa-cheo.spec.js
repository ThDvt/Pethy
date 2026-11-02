import { createClient } from '@supabase/supabase-js';
import { test, expect, CFG, TK, KHU, dangNhap, ngCanhMoi } from '../helpers.js';
import { chuanBiDuLieuDatLich, dn } from '../seed.js';
import { ok } from '../api.js';
import { pngGia } from '../luong.js';
import { psql, CO_DB } from '../luong-lon.js';

// Rà soát bảo mật nêu giả thuyết: bác sĩ A đặt URL ảnh đại diện của mình trỏ vào ảnh của bác sĩ B; khi admin gỡ ảnh của A,
// trang admin xóa nhầm ảnh của B (vì admin được xóa mọi ảnh trong kho). Test này dựng đúng kịch bản đó bằng người dùng thật.
// Hành vi đúng: ảnh của B phải còn nguyên, dù chính sách lưu trữ có chặn bước đặt URL hay chặn bước xóa.
const RANG_BUOC = 'ho_so_bac_si_anh_dai_dien_dung_thu_muc';

test('cơ sở dữ liệu từ chối URL ảnh đại diện trỏ ra ngoài thư mục của chính bác sĩ', async () => {
  await chuanBiDuLieuDatLich();
  const a = await dn(TK.bac_si);
  const nguoiLa = `${'00000000-0000-4000-8000-000000000001'}/avatar-x.png`;
  const r = await a.c.from('ho_so_bac_si').update({ anh_dai_dien: `https://x.example/storage/v1/object/public/avatar-bac-si/${nguoiLa}` }).eq('tai_khoan_id', a.id);
  expect(r.error, 'đặt URL vào thư mục người khác phải bị từ chối').not.toBeNull();
  const ok1 = await a.c.from('ho_so_bac_si').update({ anh_dai_dien: `https://x.example/storage/v1/object/public/avatar-bac-si/${a.id}/avatar-1.png` }).eq('tai_khoan_id', a.id);
  expect(ok1.error, 'URL trong thư mục của chính mình vẫn được').toBeNull();
  await a.c.from('ho_so_bac_si').update({ anh_dai_dien: null }).eq('tai_khoan_id', a.id);
});

test('admin gỡ ảnh của bác sĩ A không được xóa ảnh của bác sĩ B dù A đã đặt URL trỏ sang ảnh của B', async ({ browser }) => {
  await kichBan(browser, false);
});

// Kiểm tra riêng lớp giao diện: gỡ tạm ràng buộc của cơ sở dữ liệu để dữ liệu "bẩn" lọt vào được, rồi gắn lại.
test('lớp giao diện một mình cũng không xóa nhầm khi dữ liệu đã bị đặt sai (gỡ tạm ràng buộc CSDL)', async ({ browser }) => {
  test.skip(!CO_DB, 'Cần E2E_DB_URL');
  psql(`ALTER TABLE public.ho_so_bac_si DROP CONSTRAINT IF EXISTS ${RANG_BUOC};`);
  try { await kichBan(browser, true); }
  finally {
    psql(`UPDATE public.ho_so_bac_si SET anh_dai_dien = NULL WHERE anh_dai_dien IS NOT NULL AND position('/avatar-bac-si/' || tai_khoan_id::text || '/' IN anh_dai_dien) = 0;
          ALTER TABLE public.ho_so_bac_si DROP CONSTRAINT IF EXISTS ${RANG_BUOC};
          ALTER TABLE public.ho_so_bac_si ADD CONSTRAINT ${RANG_BUOC} CHECK (anh_dai_dien IS NULL OR (length(anh_dai_dien) <= 500 AND position('/avatar-bac-si/' || tai_khoan_id::text || '/' IN anh_dai_dien) > 0)) NOT VALID;`);
  }
});

async function kichBan(browser, phaiDatDuoc){
  test.setTimeout(150_000);
  await chuanBiDuLieuDatLich();
  const KHO = 'avatar-bac-si';
  const ad = (await dn(TK.admin)).c;

  // bác sĩ B (tài khoản mới) có một ảnh thật trong thư mục của mình
  const b = createClient(CFG.url, CFG.anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const dk = await b.auth.signUp({ email: `e2e-bs-b-${Date.now()}@example.com`, password: CFG.matKhau, options: { data: { ho_ten: 'Bs B thử chéo', so_dien_thoai: '0911000222' } } });
  if (dk.error || !dk.data.session) throw new Error('Không tạo được bác sĩ B thử');
  const idB = dk.data.user.id;
  ok(await ad.rpc('dat_vai_tro', { p_tai_khoan: idB, p_vai_tro: 'bac_si' }), 'gán vai trò bác sĩ cho B');
  const duongB = `${idB}/avatar-cua-B-${Date.now()}.png`;
  ok(await b.storage.from(KHO).upload(duongB, pngGia(360, 360), { contentType: 'image/png', upsert: false }), 'B tải ảnh');
  const urlB = b.storage.from(KHO).getPublicUrl(duongB).data.publicUrl;
  const conTon = async () => { const r = await b.storage.from(KHO).list(idB); if (r.error) throw new Error('đọc kho ảnh của B: ' + r.error.message); return r.data.some(f => duongB.endsWith('/' + f.name)); };
  expect(await conTon(), 'trước khi thử, ảnh của B có trong kho').toBe(true);

  // bác sĩ A cố đặt ảnh đại diện của mình thành URL ảnh của B
  const a = await dn(TK.bac_si);
  const dat = await a.c.from('ho_so_bac_si').update({ anh_dai_dien: urlB }).eq('tai_khoan_id', a.id);
  const datDuoc = !dat.error;
  if (phaiDatDuoc) expect(datDuoc, 'ở ca này dữ liệu bẩn phải lọt vào được để thử lớp giao diện').toBe(true);

  // admin mở hồ sơ A rồi gỡ ảnh (nếu bước đặt URL bị chặn thì A có thể không có ảnh nào để gỡ)
  const c = await ngCanhMoi(browser), p = await c.newPage();
  try {
    await dangNhap(p, TK.admin, KHU.admin);
    await p.goto('/admin/tai-khoan.html');
    await p.locator('.hang', { hasText: TK.bac_si.ten }).getByRole('button', { name: 'Hồ sơ', exact: true }).click();
    const hop = p.locator('#hop');
    await expect(hop).toBeVisible();
    const nutGo = hop.getByRole('button', { name: 'Gỡ ảnh' });
    if (await nutGo.isVisible()) { await nutGo.click(); await hop.getByRole('button', { name: /^Lưu/ }).click(); await expect(hop).not.toBeVisible({ timeout: 20_000 }); }
    else await hop.getByRole('button', { name: /^Đóng|^Hủy/ }).first().click().catch(() => {});
  } finally { await c.close(); }

  expect(await conTon(), `ảnh của B vẫn phải còn (bước đặt URL của A ${datDuoc ? 'được chấp nhận' : 'đã bị chặn'})`).toBe(true);
}
