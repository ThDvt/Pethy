import { createClient } from '@supabase/supabase-js';
import { test, expect, CFG, ngCanhMoi } from '../helpers.js';

// Đăng ký khi bắt buộc xác nhận email, người dùng nhập mã trong thư ngay tại tab đăng ký.
// Supabase thử cục bộ không bắt buộc xác nhận email, nên giả lập: chặn phản hồi đăng ký để bỏ phần phiên (giống khi chờ xác nhận).
// Mã sai: gửi thật tới GoTrue cục bộ, phải bị từ chối thật. Mã đúng: GoTrue cục bộ không phát mã qua thư, nên phản hồi xác minh
// được thay bằng phiên thật của chính tài khoản đó; phần được kiểm là trang gửi đúng yêu cầu (email, mã, loại) và đi tiếp đúng.
async function dangKyDenManChoMa(c, email, mk, sdt) {
  const tab = await c.newPage();
  await tab.route('**/auth/v1/signup**', async route => {
    const r = await route.fetch(); const j = await r.json();
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(j.user || j) });
  });
  await tab.goto('/dang-nhap.html?dang-ky');
  await tab.locator('#ho-ten').fill('Người nhập mã');
  await tab.locator('#sdt').fill(sdt);
  await tab.locator('#email').fill(email);
  await tab.locator('#mat-khau').fill(mk);
  await tab.locator('#mat-khau-2').fill(mk);
  await tab.locator('#gui').click();
  await expect(tab.locator('#tieu-de')).toHaveText('Kiểm tra email của bạn');
  await expect(tab.locator('#ma-xn')).toBeVisible();
  return tab;
}

test('nhập mã xác nhận sai: báo lỗi, vẫn ở màn nhập mã, không vào khu', async ({ browser }) => {
  test.setTimeout(90_000);
  const email = `e2e-ma-sai-${Date.now()}@example.com`, mk = 'Matkhau' + Date.now().toString().slice(-6) + 'A1';
  const c = await ngCanhMoi(browser);
  try {
    const tab = await dangKyDenManChoMa(c, email, mk, '0912345681');
    await tab.locator('#ma-xn').fill('12ab');
    await tab.locator('#gui-ma').click();
    await expect(tab.locator('#loi-ma')).toContainText('6 đến 10 chữ số');
    await tab.locator('#ma-xn').fill('000000');
    await tab.locator('#gui-ma').click();
    await expect(tab.locator('#loi-ma')).toContainText('Mã không đúng hoặc đã hết hạn');
    await expect(tab.locator('#tieu-de')).toHaveText('Kiểm tra email của bạn');
    expect(new URL(tab.url()).pathname.startsWith('/chu-nuoi')).toBe(false);
  } finally { await c.close(); }
});

test('nhập mã xác nhận đúng: trang gửi đúng yêu cầu xác minh và tự vào khu chủ nuôi', async ({ browser }) => {
  test.setTimeout(90_000);
  const email = `e2e-ma-dung-${Date.now()}@example.com`, mk = 'Matkhau' + Date.now().toString().slice(-6) + 'A1';
  const c = await ngCanhMoi(browser);
  try {
    const tab = await dangKyDenManChoMa(c, email, mk, '0912345682');
    const api = createClient(CFG.url, CFG.anon, { auth: { persistSession: false, autoRefreshToken: false } });
    const dn = await api.auth.signInWithPassword({ email, password: mk });
    expect(dn.error, 'tài khoản vừa đăng ký đăng nhập được').toBeNull();
    const s = dn.data.session; let guiDi = null;
    await tab.route('**/auth/v1/verify**', async route => {
      guiDi = route.request().postDataJSON();
      await route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ access_token: s.access_token, refresh_token: s.refresh_token, expires_in: s.expires_in, expires_at: s.expires_at, token_type: 'bearer', user: s.user }) });
    });
    await tab.locator('#ma-xn').fill('123 456');
    await tab.locator('#gui-ma').click();
    await tab.waitForURL(u => u.pathname.startsWith('/chu-nuoi'), { timeout: 20_000 });
    expect(guiDi, 'trang đã gọi xác minh').not.toBeNull();
    expect(guiDi.email).toBe(email); expect(guiDi.token).toBe('123456'); expect(guiDi.type).toBe('signup');
  } finally { await c.close(); }
});
