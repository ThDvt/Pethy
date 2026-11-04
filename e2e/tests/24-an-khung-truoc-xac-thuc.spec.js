import { test, expect, CFG, TK, KHU, dangNhap } from '../helpers.js';

const cauHinh = c => c.route('**/js/config.js', r => r.fulfill({ contentType: 'text/javascript',
  body: `window.PETHY_CONFIG={SUPABASE_URL:${JSON.stringify(CFG.url)},SUPABASE_ANON_KEY:${JSON.stringify(CFG.anon)},TURNSTILE_SITE_KEY:""};` }));

// Người chưa đăng nhập gõ /admin/ không được thoáng thấy khung trang và thực đơn quản trị trước khi bị chuyển sang đăng nhập.
// Giữ chậm khu.js (đoạn kiểm tra vai trò) để quan sát khoảng chờ.
for (const trang of ['/admin/', '/admin/tai-khoan.html', '/le-tan/', '/chu-nuoi/']) {
  test(`chưa đăng nhập vào ${trang}: không lộ khung trang trong lúc chờ rồi chuyển sang đăng nhập`, async ({ browser }) => {
    const c = await browser.newContext(); await cauHinh(c);
    try {
      const p = await c.newPage();
      // thực đơn đã lưu từ trang trước (như khi vừa dùng khu làm việc trong cùng tab): thanh bên được dựng ngay khi trình duyệt đọc tới
      await p.addInitScript(() => { try { sessionStorage.setItem('pethy.menu', JSON.stringify({ goc: '/admin/', ten: 'Quản trị', nguoi: '',
        muc: [{ ten: 'Nhật ký', href: '/admin/nhat-ky.html' }, { ten: 'Tài khoản', href: '/admin/tai-khoan.html' }] })); } catch (e) {} });
      await p.route('**/js/khu.js', async r => { await new Promise(s => setTimeout(s, 2500)); await r.continue(); });
      await p.goto(trang, { waitUntil: 'commit' });
      // chờ tới khi khung đã có trong trang (trình duyệt dừng ở khu.js bị giữ chậm), rồi mới kiểm tra là đang ẩn
      await p.locator('.bo-khu, .khach-khu').first().waitFor({ state: 'attached' });
      await expect(p.locator('.bo-khu, .khach-khu').first()).toBeHidden();
      await expect(p.locator('.thanh-ben')).toBeHidden(); // nếu đã dựng từ thực đơn lưu sẵn thì cũng không được nhìn thấy
      await p.waitForURL(u => u.pathname.startsWith('/dang-nhap'), { timeout: 20_000 });
      await expect(p.locator('html')).not.toHaveClass(/da-xac-thuc/);
    } finally { await c.close(); }
  });
}

test('đăng nhập đúng vai trò: khu làm việc hiện ra sau khi kiểm tra xong', async ({ browser }) => {
  const c = await browser.newContext(); await cauHinh(c);
  try {
    const p = await c.newPage();
    await dangNhap(p, TK.admin, KHU.admin);
    await p.goto('/admin/');
    await expect(p.locator('html')).toHaveClass(/da-xac-thuc/, { timeout: 15_000 });
    await expect(p.locator('.bo-khu')).toBeVisible();
  } finally { await c.close(); }
});
