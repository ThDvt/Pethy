import { test, expect, TK, KHU, VAI, dangNhap } from '../helpers.js';

const khongTranNgang = async page => expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();

test('trang công khai không tràn ngang trên điện thoại', async ({ page }) => {
  for (const u of ['/index.html', '/tin-tuc.html', '/dang-nhap.html', '/dang-nhap.html?dang-ky=1']) { await page.goto(u); await page.waitForTimeout(600); await khongTranNgang(page); }
});

for (const v of [...VAI, 'admin']) {
  test(`${v}: thanh điều hướng dưới đáy dùng được trên điện thoại (admin: nút menu mở bảng lưới; còn lại: thanh biểu tượng nổi)`, async ({ page }) => {
    await dangNhap(page, TK[v], KHU[v]);
    if (v !== 'admin') {
      // tài khoản ít mục: thanh viên thuốc nổi chỉ có biểu tượng, không có bảng mở lên
      const thanh = page.locator('.thanh-noi .tb-vien');
      await expect(thanh).toBeVisible();
      await expect(page.locator('.tb-them')).toBeHidden();
      const mucs = thanh.locator('.tb-v[href]');
      expect(await mucs.count()).toBeGreaterThan(0);
      for (const m of await mucs.all()) { expect(await m.getAttribute('aria-label'), 'nút chỉ có biểu tượng phải có tên').toBeTruthy(); const bb = await m.boundingBox(); expect(bb.width).toBeGreaterThanOrEqual(44); expect(bb.height).toBeGreaterThanOrEqual(44); }
      await expect(thanh.getByRole('button', { name: 'Đăng xuất' })).toBeVisible();
      await khongTranNgang(page);
      return;
    }
    const nut = page.locator('.tb-them');
    await expect(nut).toBeVisible();
    const kt = page.viewportSize(), b = await nut.boundingBox();
    expect(b.x + b.width / 2, 'nút nằm nửa phải').toBeGreaterThan(kt.width / 2);
    expect(b.y + b.height / 2, 'nút nằm nửa dưới').toBeGreaterThan(kt.height / 2);
    expect(b.width, 'đủ lớn để chạm').toBeGreaterThanOrEqual(44);
    await khongTranNgang(page);
    await nut.click();
    const bang = page.locator('.tb-tam');
    await expect(bang).toBeVisible();
    expect(await bang.locator('.tb-m').count()).toBeGreaterThan(0);
    for (const m of await bang.locator('.tb-m').all()) expect((await m.boundingBox()).height).toBeGreaterThanOrEqual(44);
    await expect(page.getByRole('button', { name: 'Đăng xuất' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(bang).toBeHidden();
  });
}
