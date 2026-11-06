import { test, expect, CFG, TK, KHU, dangNhap } from '../helpers.js';
import { chuanBiDuLieuDatLich } from '../seed.js';

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
    await expect(so).toHaveCount(1, { timeout: 8000 }); // số chưa đọc hiện ở thanh bên của lễ tân mà không ai tải lại

    // lễ tân mở trao đổi: thấy tin, số tắt; tin tiếp theo hiện ngay trong khung đang mở
    await lt.goto(NHAN);
    await expect(lt.locator('.tn-tin', { hasText: tin1 })).toBeVisible();
    const tin2 = 'Tức thời 2 ' + Date.now();
    await gui(tin2);
    await expect(lt.locator('.tn-tin', { hasText: tin2 })).toBeVisible({ timeout: 8000 });
    await expect(lt.locator(`a[href="${NHAN}"] .tb-so`)).toHaveCount(0, { timeout: 8000 }); // đang xem nên không để số tồn đọng
  } finally { await ca.close(); await cl.close(); }
});
