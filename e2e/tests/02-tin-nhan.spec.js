import { test, expect, CFG, TK, KHU, dangNhap } from '../helpers.js';

const cauHinh = c => c.route('**/js/config.js', r => r.fulfill({ contentType: 'text/javascript',
  body: `window.PETHY_CONFIG={SUPABASE_URL:${JSON.stringify(CFG.url)},SUPABASE_ANON_KEY:${JSON.stringify(CFG.anon)},TURNSTILE_SITE_KEY:""};` }));

test('nhân viên gửi tin cho admin: nút Gửi không bị kẹt, admin nhận được và trả lời được', async ({ browser }) => {
  const nd = 'Tin thử tự động ' + Date.now();
  const cn = await browser.newContext(), ca = await browser.newContext();
  await cauHinh(cn); await cauHinh(ca);
  try {
    const nv = await cn.newPage();
    await dangNhap(nv, TK.le_tan, KHU.le_tan);
    await nv.goto('/trao-doi.html');
    await nv.getByLabel('Nội dung tin nhắn').fill(nd);
    const gui = nv.getByRole('button', { name: 'Gửi', exact: true });
    await gui.click();
    // lỗi đã gặp: nút Gửi quay mãi dù tin đã gửi
    await expect(gui).toBeEnabled({ timeout: 10_000 });
    await expect(nv.getByText(nd)).toBeVisible();
    await expect(nv.getByLabel('Nội dung tin nhắn')).toHaveValue('');

    const ad = await ca.newPage();
    await dangNhap(ad, TK.admin, KHU.admin);
    await ad.goto('/admin/trao-doi.html');
    await ad.getByRole('button', { name: new RegExp(TK.le_tan.ten) }).click();
    await expect(ad.getByText(nd).last()).toBeVisible();
    const tl = 'Trả lời thử ' + Date.now();
    await ad.getByLabel('Nội dung tin nhắn').fill(tl);
    await ad.getByRole('button', { name: 'Gửi', exact: true }).click();
    await expect(ad.getByText(tl).last()).toBeVisible();
    await nv.reload();
    await expect(nv.getByText(tl)).toBeVisible();
  } finally { await cn.close(); await ca.close(); }
});

test('chủ nuôi không dùng được trang nhắn tin nội bộ', async ({ page }) => {
  await dangNhap(page, TK.chu_nuoi, KHU.chu_nuoi);
  await page.goto('/trao-doi.html');
  await page.waitForURL(u => !u.pathname.includes('trao-doi'), { timeout: 15_000 });
});
