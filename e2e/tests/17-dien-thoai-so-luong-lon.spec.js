import { test, expect, TK, KHU, dangNhap } from '../helpers.js';
import { napDuLieuLon, CO_DB } from '../luong-lon.js';

// Điện thoại (Pixel 7, iPhone 14): với nhiều dữ liệu thì các màn hình chính vẫn không tràn ngang và thao tác chính vẫn thấy được.
test.skip(!CO_DB, 'Cần E2E_DB_URL (CSDL thử cục bộ) để nạp dữ liệu lớn');
test.describe.configure({ mode: 'serial' });
test.beforeAll(async () => { test.setTimeout(180_000); await napDuLieuLon(); });
const khongTran = p => p.evaluate(() => document.documentElement.scrollWidth <= innerWidth);

test('điện thoại: lễ tân với 120+ lịch chờ và 250+ khách', async ({ page }) => {
  await dangNhap(page, TK.le_tan, KHU.le_tan);
  await page.goto('/le-tan/');
  await expect(page.getByRole('button', { name: 'Xác nhận', exact: true }).first()).toBeVisible();
  await expect(page.locator('#cho-con')).toBeVisible();
  expect(await khongTran(page), 'lễ tân không tràn ngang').toBeTruthy();
  await page.goto('/le-tan/khach-hang.html');
  await expect(page.locator('#tim-con')).toBeVisible();
  expect(await khongTran(page), 'danh sách khách không tràn ngang').toBeTruthy();
  await page.locator('#tim').fill('Khách Lớn 249');
  await expect(page.getByRole('button', { name: 'Mở' })).toHaveCount(1);
  expect(await khongTran(page)).toBeTruthy();
});

test('điện thoại: thu ngân với hàng trăm hóa đơn', async ({ page }) => {
  await dangNhap(page, TK.thu_ngan, KHU.thu_ngan);
  await page.goto('/thu-ngan/');
  await expect(page.getByRole('button', { name: 'Lập hóa đơn' }).first()).toBeVisible();
  expect(await khongTran(page), 'thu ngân không tràn ngang').toBeTruthy();
});

test('điện thoại: chủ nuôi với 80+ thú cưng và 70+ hóa đơn', async ({ page }) => {
  await dangNhap(page, TK.chu_nuoi, KHU.chu_nuoi);
  await page.goto('/chu-nuoi/thu-cung.html');
  await expect(page.locator('#ds .dong').first()).toBeVisible();
  expect(await khongTran(page), 'thú cưng không tràn ngang').toBeTruthy();
  await page.goto('/chu-nuoi/hoa-don.html');
  await expect(page.locator('#hd-con')).toBeVisible();
  expect(await khongTran(page), 'hóa đơn không tràn ngang').toBeTruthy();
  await page.goto('/chu-nuoi/dat-lich.html');
  await expect(page.locator('label.chon').first()).toBeVisible();
  expect(await khongTran(page), 'đặt lịch với nhiều thú cưng không tràn ngang').toBeTruthy();
});
