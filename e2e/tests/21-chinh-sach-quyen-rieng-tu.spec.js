import { test, expect, ngCanhMoi } from '../helpers.js';

// Trang chính sách quyền riêng tư phải mở được và được dẫn tới từ chân trang, biểu mẫu đăng ký.
test('chính sách quyền riêng tư: mở được, nêu nơi lưu dữ liệu, chỉ trang chủ và trang đăng ký có liên kết', async ({ browser }) => {
  const c = await ngCanhMoi(browser), p = await c.newPage();
  try {
    const r = await p.goto('/chinh-sach-rieng-tu.html');
    expect(r.status()).toBe(200);
    await expect(p.locator('h1')).toHaveText('Chính sách quyền riêng tư');
    await expect(p.locator('main')).toContainText('Sydney');
    // chỉ trang chủ (chân trang) và trang đăng ký dẫn tới chính sách
    await p.goto('/');
    await expect(p.locator('footer a[href="/chinh-sach-rieng-tu.html"]')).toHaveCount(1);
    await p.goto('/tin-tuc.html');
    await expect(p.locator('a[href="/chinh-sach-rieng-tu.html"]')).toHaveCount(0);
    await p.goto('/dang-nhap.html?dang-ky');
    await expect(p.locator('#dong-y')).toBeVisible();
    await expect(p.locator('a[href="/chinh-sach-rieng-tu.html"]')).toHaveCount(1);
    await expect(p.locator('label[for="dong-y"] a[href="/chinh-sach-rieng-tu.html"]')).toBeVisible();
    await expect(p.locator('body')).not.toContainText('do quản trị viên cấp');
    // bấm liên kết: mở ngay trong tab này, "Quay lại" trả về đúng trang đăng ký
    await p.goto('/dang-nhap.html?dang-ky');
    const soTab = c.pages().length;
    await p.locator('label[for="dong-y"] a').click();
    await p.waitForURL(u => u.pathname === '/chinh-sach-rieng-tu.html');
    expect(c.pages().length, 'không mở thêm tab').toBe(soTab);
    await p.locator('#quay-lai').click();
    await p.waitForURL(u => u.pathname === '/dang-nhap.html');
    await expect(p.locator('#dong-y')).toBeVisible();
    // mở thẳng trang chính sách: "Quay lại" về trang chủ
    await p.goto('/chinh-sach-rieng-tu.html');
    await p.locator('#quay-lai').click();
    await p.waitForURL(u => u.pathname === '/');
    // màn đăng nhập thường không hiện ô đồng ý hay liên kết chính sách
    await p.goto('/dang-nhap.html');
    await expect(p.locator('#dong-y')).toBeHidden();
    await expect(p.locator('a[href="/chinh-sach-rieng-tu.html"]')).toBeHidden();
  } finally { await c.close(); }
});
