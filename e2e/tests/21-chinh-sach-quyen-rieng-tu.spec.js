import { test, expect, ngCanhMoi } from '../helpers.js';

// Trang chính sách quyền riêng tư phải mở được và được dẫn tới từ chân trang, biểu mẫu đăng ký.
test('chính sách quyền riêng tư: mở được, nêu nơi lưu dữ liệu, chỉ trang đăng ký có liên kết', async ({ browser }) => {
  const c = await ngCanhMoi(browser), p = await c.newPage();
  try {
    const r = await p.goto('/chinh-sach-rieng-tu.html');
    expect(r.status()).toBe(200);
    await expect(p.locator('h1')).toHaveText('Chính sách quyền riêng tư');
    await expect(p.locator('main')).toContainText('Sydney');
    // chỉ trang đăng ký dẫn tới chính sách, đúng một liên kết
    for (const u of ['/', '/tin-tuc.html']) {
      await p.goto(u);
      await expect(p.locator('a[href="/chinh-sach-rieng-tu.html"]'), u).toHaveCount(0);
    }
    await p.goto('/dang-nhap.html?dang-ky');
    await expect(p.locator('#dong-y')).toBeVisible();
    await expect(p.locator('a[href="/chinh-sach-rieng-tu.html"]')).toHaveCount(1);
    await expect(p.locator('label[for="dong-y"] a[href="/chinh-sach-rieng-tu.html"]')).toBeVisible();
    await expect(p.locator('body')).not.toContainText('do quản trị viên cấp');
    // màn đăng nhập thường không hiện ô đồng ý hay liên kết chính sách
    await p.goto('/dang-nhap.html');
    await expect(p.locator('#dong-y')).toBeHidden();
    await expect(p.locator('a[href="/chinh-sach-rieng-tu.html"]')).toBeHidden();
  } finally { await c.close(); }
});
