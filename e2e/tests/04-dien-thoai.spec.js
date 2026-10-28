import { test, expect, TK, KHU, VAI, dangNhap } from '../helpers.js';

const khongTranNgang = async page => expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();

test('trang công khai không tràn ngang trên điện thoại', async ({ page }) => {
  for (const u of ['/index.html', '/tin-tuc.html', '/dang-nhap.html', '/dang-nhap.html?dang-ky=1']) { await page.goto(u); await page.waitForTimeout(600); await khongTranNgang(page); }
});

for (const v of [...VAI, 'admin']) {
  test(`${v}: nút menu góc dưới phải mở bảng lưới, đủ lớn để chạm`, async ({ page }) => {
    await dangNhap(page, TK[v], KHU[v]);
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
