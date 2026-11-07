import { test, expect, CFG, TK, KHU, dangNhap } from '../helpers.js';
import { chuanBiDuLieuDatLich, dn } from '../seed.js';
import { ok } from '../api.js';

const cauHinh = c => c.route('**/js/config.js', r => r.fulfill({ contentType: 'text/javascript',
  body: `window.PETHY_CONFIG={SUPABASE_URL:${JSON.stringify(CFG.url)},SUPABASE_ANON_KEY:${JSON.stringify(CFG.anon)},TURNSTILE_SITE_KEY:""};` }));
const NHAN = '/trao-doi.html'; // trang trao đổi của nhân viên; số chưa đọc nằm ở liên kết này trên thanh bên

// Hai tài khoản cùng mở: tin của người này hiện ở người kia và số tin chưa đọc đổi ngay, không phải tải lại trang.
// Đường dự phòng đếm định kỳ là 15 giây (tin) và 60 giây (số ở thanh bên); thời hạn 8 giây dưới đây chỉ đạt được khi có thời gian thực.
test('tin nhắn và số chưa đọc cập nhật tức thời giữa hai tài khoản, không cần tải lại', async ({ browser }) => {
  test.setTimeout(120_000);
  await chuanBiDuLieuDatLich();
  const ca = await browser.newContext(); await cauHinh(ca);
  const cl = await browser.newContext(); await cauHinh(cl);
  try {
    const ad = await ca.newPage(), lt = await cl.newPage();
    await dangNhap(ad, TK.admin, KHU.admin);
    await dangNhap(lt, TK.le_tan, KHU.le_tan);
    // lễ tân mở trang trao đổi một lần cho các tin cũ thành "đã đọc", rồi về trang khác
    await lt.goto(NHAN);
    await expect(lt.getByLabel('Nội dung tin nhắn')).toBeVisible();
    await lt.waitForTimeout(1500);
    await lt.goto('/le-tan/');
    const so = lt.locator(`a[href="${NHAN}"] .tb-so`);
    await expect(lt.locator(`a[href="${NHAN}"]`).first()).toBeAttached();
    await expect(so).toHaveCount(0);

    await ad.goto('/admin/trao-doi.html');
    await ad.locator('.tn-muc', { hasText: TK.le_tan.ten }).click();
    const gui = async nd => { await ad.getByLabel('Nội dung tin nhắn').fill(nd); await ad.getByRole('button', { name: 'Gửi', exact: true }).click(); };

    const tin1 = 'Tức thời 1 ' + Date.now();
    await gui(tin1);
    await expect(so.first()).toBeAttached({ timeout: 8000 }); // số chưa đọc hiện ở thanh bên của lễ tân mà không ai tải lại (thanh bên có hai bản: màn hình rộng và menu điện thoại)

    // lễ tân mở trao đổi: thấy tin, số tắt; tin tiếp theo hiện ngay trong khung đang mở
    await lt.goto(NHAN);
    await expect(lt.locator('.tn-tin', { hasText: tin1 })).toBeVisible();
    const tin2 = 'Tức thời 2 ' + Date.now();
    await gui(tin2);
    await expect(lt.locator('.tn-tin', { hasText: tin2 })).toBeVisible({ timeout: 8000 });
    await expect(lt.locator(`a[href="${NHAN}"] .tb-so`)).toHaveCount(0, { timeout: 8000 }); // đang xem nên không để số tồn đọng
  } finally { await ca.close(); await cl.close(); }
});

// Không chỉ tin nhắn: mọi trang dữ liệu đều cập nhật khi nơi khác thay đổi.
test('trang dịch vụ của admin và trang thú cưng của chủ nuôi cập nhật tức thời khi dữ liệu đổi ở nơi khác', async ({ browser }) => {
  test.setTimeout(120_000);
  await chuanBiDuLieuDatLich();
  const ca = await browser.newContext(); await cauHinh(ca);
  const cc = await browser.newContext(); await cauHinh(cc);
  try {
    // 1) admin mở trang Dịch vụ; một phiên admin khác thêm dịch vụ → xuất hiện, không tải lại
    const ad = await ca.newPage();
    await dangNhap(ad, TK.admin, KHU.admin);
    await ad.goto('/admin/dich-vu.html');
    await expect(ad.getByRole('button', { name: 'Thêm dịch vụ' })).toBeVisible();
    await ad.waitForTimeout(1500); // chờ kênh thời gian thực đăng ký xong
    const tenDv = 'Dịch vụ trực tuyến ' + Date.now();
    const admin = (await dn(TK.admin)).c;
    ok(await admin.from('dich_vu').insert({ ten: tenDv, loai: 'kham', gia: 12345 }), 'thêm dịch vụ');
    await expect(ad.locator('#vung')).toContainText(tenDv, { timeout: 8000 });

    // 2) chủ nuôi mở trang Thú cưng; thú cưng thêm từ nơi khác (thiết bị khác) → xuất hiện, không tải lại
    const cn = await cc.newPage();
    await dangNhap(cn, TK.chu_nuoi, KHU.chu_nuoi);
    await cn.goto('/chu-nuoi/thu-cung.html');
    await expect(cn.locator('#ds')).toBeVisible();
    await cn.waitForTimeout(1500);
    const tenTc = 'Trực tuyến' + Date.now();
    const kh = await dn(TK.chu_nuoi);
    const chu = ok(await kh.c.from('chu_nuoi').select('id').limit(1), 'đọc hồ sơ chủ nuôi')[0];
    ok(await kh.c.from('thu_cung').insert({ chu_nuoi_id: chu.id, ten: tenTc, loai: 'Chó' }), 'thêm thú cưng');
    await expect(cn.locator('#ds')).toContainText(tenTc, { timeout: 8000 });
  } finally { await ca.close(); await cc.close(); }
});

// Admin theo dõi mọi thay đổi của web: luồng "Hoạt động gần đây" ở Tổng quan hiện ngay một câu dễ đọc, không tải lại trang.
test('admin thấy ngay mọi thay đổi trong luồng hoạt động gần đây, viết dễ đọc và không lộ nội dung nhạy cảm', async ({ browser }) => {
  test.setTimeout(120_000);
  await chuanBiDuLieuDatLich();
  const ca = await browser.newContext(); await cauHinh(ca);
  try {
    const ad = await ca.newPage();
    await dangNhap(ad, TK.admin, KHU.admin);
    await expect(ad.getByRole('heading', { name: 'Hoạt động gần đây' })).toBeVisible();
    await ad.waitForTimeout(1500);
    const ten = 'Hoạt động ' + Date.now();
    const admin = (await dn(TK.admin)).c;
    ok(await admin.from('dich_vu').insert({ ten, loai: 'kham', gia: 123456 }), 'thêm dịch vụ');
    const dong = ad.locator('.hd-luong .hd-dong', { hasText: ten });
    await expect(dong).toBeVisible({ timeout: 8000 });
    await expect(dong).toContainText('Thêm dịch vụ');
    await expect(dong).toContainText('Admin');
    ok(await admin.from('dich_vu').update({ gia: 654321 }).eq('ten', ten), 'đổi giá');
    await expect(ad.locator('.hd-luong .hd-dong', { hasText: 'Đổi giá dịch vụ ' + ten })).toContainText('654.321', { timeout: 8000 });
    // người không phải admin không gọi được luồng này
    const lt = (await dn(TK.le_tan)).c;
    expect((await lt.rpc('hoat_dong_gan_day', { p_gioi_han: 5 })).error, 'lễ tân gọi hoat_dong_gan_day').toBeTruthy();
  } finally { await ca.close(); }
});
