import { test, expect, CFG, TK, KHU, dangNhap } from '../helpers.js';

const cauHinh = c => c.route('**/js/config.js', r => r.fulfill({ contentType: 'text/javascript',
  body: `window.PETHY_CONFIG={SUPABASE_URL:${JSON.stringify(CFG.url)},SUPABASE_ANON_KEY:${JSON.stringify(CFG.anon)},TURNSTILE_SITE_KEY:""};` }));

// Bấm sang người khác thì viền cam chuyển ngay, kể cả khi mạng chậm (tải tin nhắn mất vài giây).
test('quản trị: viền chọn hội thoại đổi ngay khi bấm, không chờ tải tin nhắn', async ({ browser }) => {
  test.setTimeout(90_000);
  const c = await browser.newContext(); await cauHinh(c);
  try {
    const p = await c.newPage();
    await dangNhap(p, TK.admin, KHU.admin);
    await p.goto('/admin/trao-doi.html');
    const muc = p.locator('.tn-muc');
    await expect(muc.nth(1)).toBeVisible();
    await p.route('**/rest/v1/tin_nhan*', async r => { await new Promise(s => setTimeout(s, 3000)); await r.continue(); });
    await muc.nth(0).click();
    await expect(muc.nth(0)).toHaveAttribute('aria-current', 'true', { timeout: 1000 });
    await muc.nth(1).click();
    await expect(muc.nth(1)).toHaveAttribute('aria-current', 'true', { timeout: 1000 }); // trước khi 3 giây chờ tải xong
    await expect(muc.nth(0)).not.toHaveAttribute('aria-current', 'true');
  } finally { await c.close(); }
});
