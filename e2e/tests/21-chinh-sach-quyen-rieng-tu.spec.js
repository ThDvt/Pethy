import { test, expect, ngCanhMoi } from '../helpers.js';

// Trang chính sách quyền riêng tư phải mở được và được dẫn tới từ chân trang, biểu mẫu đăng ký.
test('chính sách quyền riêng tư: mở được, nêu nơi lưu dữ liệu, có liên kết từ trang chủ và đăng ký', async ({ browser }) => {
  const c = await ngCanhMoi(browser), p = await c.newPage();
  try {
    const r = await p.goto('/chinh-sach-rieng-tu.html');
    expect(r.status()).toBe(200);
    await expect(p.locator('h1')).toHaveText('Chính sách quyền riêng tư');
    await expect(p.locator('main')).toContainText('Sydney');
    await p.goto('/');
    await expect(p.locator('footer a[href="/chinh-sach-rieng-tu.html"]')).toBeVisible();
    await p.goto('/dang-nhap.html?dang-ky');
    await expect(p.locator('#dong-y')).toBeVisible();
    await expect(p.locator('label[for="dong-y"] a[href="/chinh-sach-rieng-tu.html"]')).toBeVisible();
    // đăng nhập thường không bị chặn bởi ô đồng ý
    await p.goto('/dang-nhap.html');
    await expect(p.locator('#dong-y')).toBeHidden();
  } finally { await c.close(); }
});
