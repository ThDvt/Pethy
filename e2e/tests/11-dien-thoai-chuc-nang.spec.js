import { test, expect, TK, KHU, dangNhap } from '../helpers.js';
import { chuanBiDuLieuTiem } from '../seed.js';

// Chạy ở khung điện thoại (xem tên tệp trong playwright.config.js): mọi trang chức năng không tràn ngang,
// và các hộp thoại nằm gọn trong màn hình với nút lưu bấm được.
const khongTranNgang = async (page, ten) => expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'không tràn ngang: ' + ten).toBeTruthy();
const gonTrongMan = async (page, hop, ten) => {
  const b = await hop.boundingBox(), kt = page.viewportSize();
  expect(b, 'có hộp ' + ten).toBeTruthy();
  expect(b.x, ten + ' không lệch trái').toBeGreaterThanOrEqual(-1);
  expect(b.x + b.width, ten + ' không lệch phải').toBeLessThanOrEqual(kt.width + 1);
  expect(b.y + b.height, ten + ' không tràn dưới').toBeLessThanOrEqual(kt.height + 1);
};

const TRANG = {
  le_tan: ['/le-tan/', '/le-tan/khach-hang.html', '/trao-doi.html'],
  bac_si: ['/bac-si/', '/bac-si/ho-so.html', '/trao-doi.html'],
  thu_ngan: ['/thu-ngan/', '/trao-doi.html'],
  kho: ['/kho/', '/trao-doi.html'],
  chu_nuoi: ['/chu-nuoi/', '/chu-nuoi/dat-lich.html', '/chu-nuoi/thu-cung.html', '/chu-nuoi/hoa-don.html'],
  admin: ['/admin/', '/admin/dich-vu.html', '/admin/tai-khoan.html', '/admin/lich-lam-viec.html', '/admin/tham-so.html', '/admin/doanh-thu.html', '/admin/danh-gia.html', '/admin/nhat-ky.html', '/admin/bai-viet.html', '/admin/bao-mat.html', '/admin/trao-doi.html']
};
for (const [v, ds] of Object.entries(TRANG)) {
  test(`${v}: các trang chức năng không tràn ngang trên điện thoại`, async ({ page }) => {
    if (v === 'chu_nuoi' || v === 'bac_si') await chuanBiDuLieuTiem();
    await dangNhap(page, TK[v], KHU[v]);
    for (const u of ds) { await page.goto(u); await page.waitForLoadState('networkidle'); await expect(page.locator('.tb-them')).toBeVisible(); await khongTranNgang(page, v + ' ' + u); }
  });
}

test('lễ tân: hộp "Thêm khách mới" nằm gọn trong màn hình, nút bấm được', async ({ page }) => {
  await dangNhap(page, TK.le_tan, KHU.le_tan);
  await page.goto('/le-tan/khach-hang.html');
  await page.getByRole('button', { name: 'Thêm khách mới' }).click();
  const hop = page.locator('#hop');
  await expect(hop).toBeVisible();
  await gonTrongMan(page, hop, 'hộp thêm khách');
  const nut = hop.getByRole('button', { name: 'Thêm khách', exact: true });
  await nut.scrollIntoViewIfNeeded();
  expect((await nut.boundingBox()).height).toBeGreaterThanOrEqual(40);
});

test('admin: hộp "Thêm dịch vụ" và "Thêm nhân viên" nằm gọn trong màn hình', async ({ page }) => {
  await dangNhap(page, TK.admin, KHU.admin);
  await page.goto('/admin/dich-vu.html');
  await page.getByRole('button', { name: 'Thêm dịch vụ' }).click();
  await expect(page.locator('#hop')).toBeVisible();
  await gonTrongMan(page, page.locator('#hop'), 'hộp thêm dịch vụ');
  await page.locator('#hop').getByRole('button', { name: 'Đóng' }).click();
  await page.goto('/admin/tai-khoan.html');
  await page.locator('#them-nv').click();
  await expect(page.locator('#hop')).toBeVisible();
  await gonTrongMan(page, page.locator('#hop'), 'hộp thêm nhân viên');
});

test('thủ kho: hộp "Thêm thuốc" nằm gọn trong màn hình', async ({ page }) => {
  await dangNhap(page, TK.kho, KHU.kho);
  await page.locator('#them-thuoc').click();
  await expect(page.locator('#hop')).toBeVisible();
  await gonTrongMan(page, page.locator('#hop'), 'hộp thêm thuốc');
});
