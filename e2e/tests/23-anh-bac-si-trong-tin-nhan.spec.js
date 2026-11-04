import { test, expect, CFG, TK, KHU, dangNhap } from '../helpers.js';
import { chuanBiDuLieuDatLich, dn } from '../seed.js';

const cauHinh = c => c.route('**/js/config.js', r => r.fulfill({ contentType: 'text/javascript',
  body: `window.PETHY_CONFIG={SUPABASE_URL:${JSON.stringify(CFG.url)},SUPABASE_ANON_KEY:${JSON.stringify(CFG.anon)},TURNSTILE_SITE_KEY:""};` }));
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

// Bác sĩ đã đổi ảnh đại diện (hiện ở trang chủ) thì hộp thư nội bộ của admin cũng phải dùng ảnh đó, không phải chữ cái mặc định.
test('hộp thư admin hiện ảnh đại diện thật của bác sĩ; nhân viên không có ảnh vẫn dùng chữ cái', async ({ browser }) => {
  test.setTimeout(90_000);
  await chuanBiDuLieuDatLich();
  const bs = await dn(TK.bac_si);
  const url = `${CFG.url}/storage/v1/object/public/avatar-bac-si/${bs.id}/chat-anh.png`;
  const dat = await bs.c.from('ho_so_bac_si').update({ anh_dai_dien: url }).eq('tai_khoan_id', bs.id);
  expect(dat.error, 'đặt ảnh đại diện cho bác sĩ').toBeNull();
  const c = await browser.newContext(); await cauHinh(c);
  await c.route('**/avatar-bac-si/**', r => r.fulfill({ contentType: 'image/png', body: PNG }));
  try {
    const ad = await c.newPage();
    await dangNhap(ad, TK.admin, KHU.admin);
    await ad.goto('/admin/trao-doi.html');
    const muc = ten => ad.locator('.tn-muc', { hasText: ten });
    await expect(muc(TK.bac_si.ten).locator('img.tn-av-anh')).toHaveAttribute('src', url);
    await expect(muc(TK.le_tan.ten).locator('img.tn-av-anh')).toHaveCount(0);
    await expect(muc(TK.le_tan.ten).locator('.tn-av')).not.toBeEmpty();
    await muc(TK.bac_si.ten).click();
    await expect(ad.locator('.tn-dau img.tn-av-anh')).toHaveAttribute('src', url);
  } finally {
    await bs.c.from('ho_so_bac_si').update({ anh_dai_dien: null }).eq('tai_khoan_id', bs.id);
    await c.close();
  }
});
