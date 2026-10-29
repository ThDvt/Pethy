import { expect } from './helpers.js';

export const ngayVN = soNgayToi => new Date(Date.now() + soNgayToi * 864e5 + 7 * 36e5).toISOString().slice(0, 10);

// Chủ nuôi thêm thú cưng qua giao diện.
export async function themThuCung(page, ten, loai = 'Chó'){
  await page.goto('/chu-nuoi/thu-cung.html');
  await page.locator('#ten').fill(ten);
  await page.locator('#loai').fill(loai);
  await page.locator('#gui').click();
  await expect(page.locator('#ds')).toContainText(ten);
}

// Chọn thú cưng, dịch vụ, bác sĩ, ngày và giờ rồi đặt. `vung` là trang đặt lịch (chủ nuôi hoặc lễ tân đặt hộ).
// Trả về chữ giờ đã chọn, ví dụ "08:30".
export async function dienDatLich(page, { pet, dv, bs, vaccine, ngay, gio = "dau" }){
  if (pet) await page.locator('label.chon', { hasText: pet }).click();
  await page.locator('label.chon', { hasText: dv }).click();
  if (vaccine) await page.locator('#vc-box label.chon', { hasText: vaccine }).click();
  await page.locator('label.chon', { hasText: bs }).click();
  await page.getByRole('button', { name: 'Tiếp tục: chọn giờ' }).click();
  await page.locator('#ngay').fill(ngay);
  const nut = page.locator('#gio-box .tg button');
  await expect(nut.first()).toBeVisible();
  const chon = gio === 'cuoi' ? nut.last() : nut.first();
  const chu = (await chon.textContent()).trim();
  await chon.click();
  await page.getByRole('button', { name: 'Tiếp tục: xác nhận' }).click();
  await page.getByRole('button', { name: /^Đặt lịch$/ }).click();
  return chu;
}
