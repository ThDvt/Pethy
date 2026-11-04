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
    } finally { await c.close(); }
  });
}

test('đã đăng nhập: khung hiện sẵn như cũ, không bị ẩn lúc chờ kiểm tra vai trò', async ({ browser }) => {
  const c = await browser.newContext(); await cauHinh(c);
  try {
    const p = await c.newPage();
    await dangNhap(p, TK.admin, KHU.admin);
    // ghi lại mọi lần html bị gắn lớp ẩn trong lúc tải trang
    await p.addInitScript(() => { window.__an = false;
      new MutationObserver(() => { if (document.documentElement.classList.contains('khong-phien')) window.__an = true; })
        .observe(document.documentElement, { attributes: true, attributeFilter: ['class'] }); });
    await p.route('**/js/khu.js', async r => { await new Promise(s => setTimeout(s, 1500)); await r.continue(); });
    await p.goto('/admin/', { waitUntil: 'commit' });
    await p.locator('.bo-khu').waitFor({ state: 'attached' });
    await expect(p.locator('.bo-khu')).toBeVisible(); // thấy ngay cả khi khu.js còn chưa chạy
    await p.waitForLoadState('load');
    expect(await p.evaluate(() => window.__an)).toBe(false);
  } finally { await c.close(); }
});
