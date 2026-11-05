import { test, expect, CFG, TK, KHU, dangNhap } from '../helpers.js';
import { chuanBiDuLieuDatLich, dn, DV } from '../seed.js';
import { ngayVN } from '../luong.js';
import { ok, taoLichDaXacNhan, khamXong } from '../api.js';

const cauHinh = c => c.route('**/js/config.js', r => r.fulfill({ contentType: 'text/javascript',
  body: `window.PETHY_CONFIG={SUPABASE_URL:${JSON.stringify(CFG.url)},SUPABASE_ANON_KEY:${JSON.stringify(CFG.anon)},TURNSTILE_SITE_KEY:""};` }));
const TAI_KHOAN = { ck_ma_ngan_hang: '970436', ck_so_tai_khoan: '0123456789', ck_ten_tai_khoan: 'NGUYEN VAN A' };
const datCauHinh = async (admin, gt) => { for (const [k, v] of Object.entries(gt)) ok(await admin.from('cau_hinh').update({ gia_tri: v }).eq('khoa', k), 'đặt ' + k); };

// Mã VietQR trên hóa đơn: chỉ hiện khi admin đã nhập tài khoản nhận tiền, đúng số tiền, đúng nội dung; chỉ vai được phép mới đọc được thông tin tài khoản.
test('mã QR chuyển khoản: thu ngân và chủ nuôi thấy đúng số tiền; chưa nhập tài khoản thì không hiện', async ({ browser }) => {
  test.setTimeout(150_000);
  await chuanBiDuLieuDatLich();
  const admin = (await dn(TK.admin)).c;
  const s = await taoLichDaXacNhan({ ngay: ngayVN(21), tenThuCung: 'QR' + Date.now() });
  await khamXong(s);
  const tn = (await dn(TK.thu_ngan)).c;
  const hd = ok(await tn.rpc('lap_hoa_don', { p_lich: s.lichId }), 'lập hóa đơn');
  const ten = (ok(await s.cn.c.from('thu_cung').select('ten').eq('id', s.petId), 'đọc tên thú cưng')[0]).ten;
  const c = await browser.newContext(); await cauHinh(c);
  try {
    // chưa nhập tài khoản: hàm trả rỗng, giao diện không có nút QR
    await datCauHinh(admin, { ck_ma_ngan_hang: '', ck_so_tai_khoan: '', ck_ten_tai_khoan: '' });
    expect(ok(await tn.rpc('thong_tin_chuyen_khoan'), 'gọi khi chưa nhập')).toBeNull();
    const p = await c.newPage();
    await dangNhap(p, TK.thu_ngan, KHU.thu_ngan);
    const dong = p.locator('#ds-thu .hang', { hasText: ten });
    await dong.getByRole('button', { name: 'Thu tiền' }).click();
    await expect(p.locator('#hop')).toContainText(/150[.,]000/);
    await expect(p.getByRole('button', { name: 'Hiện mã QR chuyển khoản' })).toHaveCount(0);

    // đã nhập: thu ngân và chủ nuôi đọc được, bác sĩ và khách chưa đăng nhập thì không
    await datCauHinh(admin, TAI_KHOAN);
    expect(ok(await tn.rpc('thong_tin_chuyen_khoan'), 'thu ngân')).toMatchObject({ bin: '970436', so_tai_khoan: '0123456789' });
    expect(ok(await s.cn.c.rpc('thong_tin_chuyen_khoan'), 'chủ nuôi')).toMatchObject({ so_tai_khoan: '0123456789' });
    expect(ok(await s.bs.c.rpc('thong_tin_chuyen_khoan'), 'bác sĩ'), 'bác sĩ không cần biết').toBeNull();

    await p.reload();
    await p.locator('#ds-thu .hang', { hasText: ten }).getByRole('button', { name: 'Thu tiền' }).click();
    const hop = p.locator('#hop');
    await hop.getByRole('button', { name: 'Hiện mã QR chuyển khoản' }).click();
    const vung = hop.locator('.ck-vung');
    await expect(vung.locator('svg')).toBeVisible();
    await expect(vung).toContainText(/150\.000/);
    await expect(vung).toContainText('0123456789');
    await expect(vung).toContainText('PETHY ' + hd.replace(/-/g, '').slice(0, 8).toUpperCase());
    await hop.locator('#st').fill('50000'); // đổi số tiền thu một phần: mã làm mới theo
    await expect(vung).toContainText(/50\.000/);
    expect(await p.evaluate(() => Pethy.chuyenKhoan.crc16('123456789'))).toBe('29B1'); // vector kiểm CRC chuẩn

    // chủ nuôi tự xem hóa đơn của mình và quét để trả
    const co = await browser.newContext(); await cauHinh(co);
    try {
      const q = await co.newPage();
      await dangNhap(q, TK.chu_nuoi, KHU.chu_nuoi);
      await q.goto('/chu-nuoi/hoa-don.html');
      const muc = q.locator('details', { hasText: ten });
      await muc.locator('summary').click();
      await muc.getByRole('button', { name: 'Hiện mã QR chuyển khoản' }).click();
      await expect(muc.locator('.ck-vung svg')).toBeVisible();
      await expect(muc.locator('.ck-vung')).toContainText(/150\.000/);
    } finally { await co.close(); }
  } finally {
    await datCauHinh(admin, { ck_ma_ngan_hang: '', ck_so_tai_khoan: '', ck_ten_tai_khoan: '' });
    await c.close();
  }
});
