import { test, expect, TK, KHU, dangNhap } from '../helpers.js';
import { napDuLieuLon, CO_DB, SO, so, tongThu, psql } from '../luong-lon.js';

// Số lượng lớn: hàng trăm khách, thú cưng, lịch và hóa đơn. Xem màn hình có còn nhanh, có báo đúng khi danh sách bị cắt, và số liệu có khớp CSDL.
test.skip(!CO_DB, 'Cần E2E_DB_URL (CSDL thử cục bộ) để nạp dữ liệu lớn');
test.describe.configure({ mode: 'serial' });
const NGUONG_TAI = 15_000;   // mỗi màn hình phải hiện xong dữ liệu trong 15 giây, rộng rãi so với mức bình thường (dưới 3 giây)

test.beforeAll(async () => { test.setTimeout(180_000); await napDuLieuLon(); });

async function vao(page, tk, khu, duong, choDoi){
  await dangNhap(page, tk, khu);
  const t0 = Date.now();
  await page.goto(duong);
  await choDoi();
  return Date.now() - t0;
}
const khongTran = p => p.evaluate(() => document.documentElement.scrollWidth <= innerWidth);

test('lễ tân: 120+ lịch chờ xác nhận, chỉ hiện 50 nhưng báo đúng tổng; xác nhận bớt thì danh sách đầy lại', async ({ page }) => {
  const ms = await vao(page, TK.le_tan, KHU.le_tan, '/le-tan/', () => expect(page.getByRole('button', { name: 'Xác nhận', exact: true }).first()).toBeVisible());
  expect(ms, 'thời gian hiện danh sách').toBeLessThan(NGUONG_TAI);
  const tieuDe = async () => so((await page.locator('#h-cho').textContent()));
  const tong = await tieuDe();
  expect(tong, 'tiêu đề ghi đúng tổng, không phải 50').toBeGreaterThanOrEqual(SO.cho);
  await expect(page.getByRole('button', { name: 'Xác nhận', exact: true })).toHaveCount(50);
  await expect(page.locator('#cho-con')).toContainText('Đang hiển thị 50');
  await expect(page.locator('#cho-con')).toContainText(String(tong - 50));
  expect(await khongTran(page), 'không tràn ngang').toBeTruthy();
  // xác nhận một lịch: tổng giảm 1, vẫn đủ 50 dòng (lịch thứ 51 được đưa lên)
  await page.getByRole('button', { name: 'Xác nhận', exact: true }).first().click();
  await expect(page.locator('#h-cho')).toContainText(`(${tong - 1})`);
  await expect(page.getByRole('button', { name: 'Xác nhận', exact: true })).toHaveCount(50);
});

test('lễ tân: danh sách khách 250+ người chỉ hiện 30, tìm theo tên hoặc số điện thoại vẫn ra đúng người ở cuối danh sách', async ({ page }) => {
  const ms = await vao(page, TK.le_tan, KHU.le_tan, '/le-tan/khach-hang.html', () => expect(page.locator('#tim-con')).toBeVisible());
  expect(ms).toBeLessThan(NGUONG_TAI);
  await expect(page.locator('.hang', { has: page.getByRole('button', { name: 'Mở' }) })).toHaveCount(30);
  await expect(page.locator('#tim-con')).toContainText('Đang hiển thị 30');
  // khách thứ 250 theo tên nằm ngoài 30 người đầu
  await page.locator('#tim').fill('Khách Lớn 250');
  await expect(page.locator('.hang', { has: page.getByRole('button', { name: 'Mở' }) })).toHaveCount(1);
  await expect(page.locator('#tim-con')).toHaveCount(0);
  await page.getByRole('button', { name: 'Mở' }).click();
  await expect(page.locator('#hop')).toContainText('Bé 250');
  await page.locator('#hop').getByRole('button', { name: 'Đóng' }).click();
  await page.locator('#tim').fill('0900000137');
  await expect(page.locator('.hang', { has: page.getByRole('button', { name: 'Mở' }) })).toHaveCount(1);
  await expect(page.locator('.hang').first()).toContainText('Khách Lớn 137');
  // tìm một cụm có nhiều kết quả: vẫn cắt 30 và báo
  await page.locator('#tim').fill('Khách Lớn');
  await expect(page.locator('#tim-con')).toBeVisible();
});

test('thu ngân: hàng trăm hóa đơn, số liệu "Thu hôm nay" khớp CSDL, lập hóa đơn vẫn mở được hộp', async ({ page }) => {
  const ms = await vao(page, TK.thu_ngan, KHU.thu_ngan, '/thu-ngan/', () => expect(page.getByRole('button', { name: 'Lập hóa đơn' }).first()).toBeVisible());
  expect(ms).toBeLessThan(NGUONG_TAI);
  expect(await page.locator('#ds-lap .hang').count()).toBeGreaterThanOrEqual(SO.thuNganChuaLap);
  expect(await page.locator('#ds-thu .hang').count()).toBeGreaterThanOrEqual(SO.thuNganChuaThu);
  expect(await page.locator('#ds-xong .hang').count()).toBeGreaterThanOrEqual(SO.thuNganDaThu);
  expect(await khongTran(page)).toBeTruthy();
  // số tiền thu hôm nay trên màn hình = tổng thanh toán hôm nay trong CSDL (tính độc lập bằng SQL)
  const hn = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
  expect(so(await page.locator('#hom-nay .so-thu').textContent())).toBe(tongThu(hn, hn));
  await page.getByRole('button', { name: 'Lập hóa đơn' }).first().click();
  await expect(page.locator('#hop')).toBeVisible();
  await expect(page.locator('#hop')).toContainText('Hóa đơn của');
});

test('chủ nuôi: 80+ thú cưng đều hiện; 70+ hóa đơn chỉ hiện 50 và báo đúng tổng', async ({ page }) => {
  let ms = await vao(page, TK.chu_nuoi, KHU.chu_nuoi, '/chu-nuoi/thu-cung.html', () => expect(page.locator('#ds .dong').first()).toBeVisible());
  expect(ms).toBeLessThan(NGUONG_TAI);
  expect(await page.locator('#ds .dong').count()).toBeGreaterThanOrEqual(SO.thuCungChuNuoi);
  await expect(page.locator('#ds .dong', { hasText: 'Thú Lớn 080' })).toHaveCount(1);
  expect(await khongTran(page)).toBeTruthy();
  ms = Date.now(); await page.goto('/chu-nuoi/hoa-don.html');
  await expect(page.locator('#hd-con')).toBeVisible();
  expect(Date.now() - ms).toBeLessThan(NGUONG_TAI);
  await expect(page.locator('#vung > details')).toHaveCount(50);
  await expect(page.locator('#hd-con')).toContainText('Đang hiển thị 50 hóa đơn gần nhất trong tổng số');
  expect(await khongTran(page)).toBeTruthy();
  await page.locator('#vung > details summary').first().click();            // mở một hóa đơn vẫn xem được chi tiết
  await expect(page.locator('#vung > details').first()).toContainText('Khám tổng quát E2E');
});

test('admin: doanh thu tổng và nhật ký với hàng trăm giao dịch khớp CSDL, nhật ký chỉ hiện 100 dòng gần nhất', async ({ page }) => {
  await dangNhap(page, TK.admin, KHU.admin);
  const hn = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
  await page.goto('/admin/doanh-thu.html');
  await page.locator('#tu').fill('2020-01-01');
  await page.getByRole('button', { name: 'Xem', exact: true }).click();
  await expect(page.getByText('Tổng đã thu')).toBeVisible();
  const mong = tongThu('2020-01-01', hn);
  expect(mong, 'đã có giao dịch lớn').toBeGreaterThanOrEqual((SO.thuNganDaThu + SO.hoaDonChuNuoi) * SO.tienHd);
  await expect(page.locator('#ket-qua .the').first()).toContainText(String(mong).replace(/\B(?=(\d{3})+(?!\d))/g, '.'));
  expect(await khongTran(page)).toBeTruthy();
  const t0 = Date.now(); await page.goto('/admin/nhat-ky.html');
  await expect(page.locator('#nk-con')).toBeVisible();
  expect(Date.now() - t0).toBeLessThan(NGUONG_TAI);
  await expect(page.locator('#vung .hang')).toHaveCount(100);
  await expect(page.locator('#nk-con')).toContainText('Đang hiển thị 100 bản ghi gần nhất');
  expect(await khongTran(page)).toBeTruthy();
  expect(Number(psql(`SELECT count(*) FROM nhat_ky;`)), 'nhật ký thật có nhiều hơn số đang hiện').toBeGreaterThan(100);
});
