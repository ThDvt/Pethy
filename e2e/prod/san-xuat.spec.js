import { test, expect } from '@playwright/test';

test('trang chủ tải được, hiện dịch vụ và bác sĩ từ dữ liệu thật, không lỗi JavaScript', async ({ page }) => {
  const loi = [];
  page.on('pageerror', e => loi.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/favicon/.test(m.text())) loi.push(m.text()); });
  const r = await page.goto('/');
  expect(r.status()).toBe(200);
  await expect(page.locator('#ds-dich-vu .the-dv').first()).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('#ds-bac-si')).not.toContainText('Đang tải');
  expect(loi, 'lỗi trong console').toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'không tràn ngang').toBeTruthy();
});

test('tiêu đề bảo mật của Cloudflare còn hiệu lực', async ({ request }) => {
  const r = await request.get('/');
  const h = r.headers();
  expect(h['content-security-policy'], 'CSP').toContain("default-src 'self'");
  expect(h['x-content-type-options']).toBe('nosniff');
});

test('các trang quan trọng không trả lỗi', async ({ request }) => {
  for (const u of ['/dang-nhap', '/tin-tuc', '/robots.txt']) expect((await request.get(u)).status(), u).toBe(200);
  expect((await request.get('/khong-co-trang-nay-12345')).status()).toBe(404);
});

test('khu nhân viên đưa khách chưa đăng nhập về trang đăng nhập', async ({ page }) => {
  for (const u of ['/admin/', '/le-tan/', '/chu-nuoi/']) { await page.goto(u); await page.waitForURL(/dang-nhap/, { timeout: 20_000 }); }
});

test('trang đăng nhập có đủ ô và nút', async ({ page }) => {
  await page.goto('/dang-nhap');
  await expect(page.locator('#email')).toBeVisible();
  await expect(page.locator('#mat-khau')).toBeVisible();
  await expect(page.locator('#gui')).toBeVisible();
});
