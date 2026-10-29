import { expect } from './helpers.js';
import { deflateSync } from 'node:zlib';


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

// PNG đơn sắc 800x450 tạo tại chỗ (không phụ thuộc tệp ngoài).
export function pngGia(w = 800, h = 450){
  const bang = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; bang[n] = c >>> 0; }
  const crc = b => { let r = 0xffffffff; for (const x of b) r = bang[(r ^ x) & 255] ^ (r >>> 8); return (r ^ 0xffffffff) >>> 0; };
  const chunk = (ten, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(ten), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  const hang = Buffer.concat([Buffer.from([0]), Buffer.alloc(w * 3, 180)]);
  const raw = Buffer.concat(Array.from({ length: h }, () => hang));
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

