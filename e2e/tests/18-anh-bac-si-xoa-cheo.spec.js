import { createClient } from '@supabase/supabase-js';
import { test, expect, CFG, TK, KHU, dangNhap, ngCanhMoi } from '../helpers.js';
import { chuanBiDuLieuDatLich, dn } from '../seed.js';
import { ok } from '../api.js';
import { pngGia } from '../luong.js';

// Rà soát bảo mật nêu giả thuyết: bác sĩ A đặt URL ảnh đại diện của mình trỏ vào ảnh của bác sĩ B; khi admin gỡ ảnh của A,
// trang admin xóa nhầm ảnh của B (vì admin được xóa mọi ảnh trong kho). Test này dựng đúng kịch bản đó bằng người dùng thật.
// Hành vi đúng: ảnh của B phải còn nguyên, dù chính sách lưu trữ có chặn bước đặt URL hay chặn bước xóa.
test('admin gỡ ảnh của bác sĩ A không được xóa ảnh của bác sĩ B dù A đã đặt URL trỏ sang ảnh của B', async ({ browser }) => {
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
});
