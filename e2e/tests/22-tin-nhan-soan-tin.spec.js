import { test, expect, CFG, TK, KHU, dangNhap } from '../helpers.js';

const cauHinh = c => c.route('**/js/config.js', r => r.fulfill({ contentType: 'text/javascript',
  body: `window.PETHY_CONFIG={SUPABASE_URL:${JSON.stringify(CFG.url)},SUPABASE_ANON_KEY:${JSON.stringify(CFG.anon)},TURNSTILE_SITE_KEY:""};` }));

// Ô soạn tin kiểu ứng dụng nhắn tin: Enter gửi trên máy có chuột, trên cảm ứng Enter chỉ xuống dòng; tin có nhóm theo người gửi.
test('ô soạn tin: Enter, Shift+Enter, tin rỗng, tin nhiều dòng giữ nguyên xuống dòng', async ({ browser }) => {
  test.setTimeout(90_000);
  const c = await browser.newContext(); await cauHinh(c);
  try {
    const nv = await c.newPage();
    await dangNhap(nv, TK.le_tan, KHU.le_tan);
    await nv.goto('/trao-doi.html');
    const o = nv.getByLabel('Nội dung tin nhắn'), gui = nv.getByRole('button', { name: 'Gửi', exact: true });
    await expect(o).toBeVisible();
    const chuot = await nv.evaluate(() => matchMedia('(pointer:fine)').matches);
    const dau = 'Nhiều dòng ' + Date.now();

    // tin rỗng hoặc toàn khoảng trắng không gửi
    await o.fill('   '); await gui.click();
    await expect(o).toHaveValue('   ');
    await o.fill('');

    await o.fill(dau + '\ndòng hai');
    if (chuot) {
      await o.press('Enter');
      await expect(o).toHaveValue('', { timeout: 10_000 });
    } else {
      await o.press('Enter'); // cảm ứng: Enter là xuống dòng, không gửi
      await expect(o).toHaveValue(dau + '\ndòng hai\n');
      await gui.click();
      await expect(o).toHaveValue('', { timeout: 10_000 });
    }
    const bong = nv.locator('.tn-bong', { hasText: dau });
    await expect(bong).toHaveCount(1);
    expect(await bong.evaluate(e => e.innerText)).toContain('\ndòng hai');

    if (chuot) { // Shift+Enter xuống dòng, không gửi
      const sau = 'Shift ' + Date.now();
      await o.fill(sau); await o.press('Shift+Enter'); await o.type('tiếp');
      await expect(o).toHaveValue(sau + '\ntiếp');
      await expect(nv.locator('.tn-bong', { hasText: sau })).toHaveCount(0);
    }
  } finally { await c.close(); }
});
