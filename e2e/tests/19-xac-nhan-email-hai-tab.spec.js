import { createClient } from '@supabase/supabase-js';
import { test, expect, CFG, ngCanhMoi } from '../helpers.js';

// Đăng ký khi bắt buộc xác nhận email: tab đăng ký hiện "Kiểm tra email của bạn"; khi người dùng bấm liên kết trong thư (mở ở tab khác),
// tab mới phải vào được khu, và tab đăng ký phải tự đi tiếp thay vì đứng yên với form cũ.
// Supabase thử cục bộ không bắt buộc xác nhận email, nên giả lập: chặn phản hồi đăng ký để bỏ phần phiên (giống khi chờ xác nhận),
// rồi dùng mã phiên thật của chính tài khoản đó đặt vào địa chỉ liên kết, đúng dạng Supabase gửi qua thư.
test('bấm liên kết xác nhận email ở tab khác: tab mới vào được khu và tab đăng ký tự đi tiếp', async ({ browser }) => {
  test.setTimeout(120_000);
  const email = `e2e-xn-${Date.now()}@example.com`, mk = 'Matkhau' + Date.now().toString().slice(-6) + 'A1';
  const c = await ngCanhMoi(browser), tabDangKy = await c.newPage();
  try {
    await tabDangKy.route('**/auth/v1/signup**', async route => {
      const r = await route.fetch(); const j = await r.json();
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(j.user || j) });
    });
    await tabDangKy.goto('/dang-nhap.html?dang-ky');
    await tabDangKy.locator('#ho-ten').fill('Người xác nhận thử');
    await tabDangKy.locator('#sdt').fill('0912345680');
    await tabDangKy.locator('#email').fill(email);
    await tabDangKy.locator('#mat-khau').fill(mk);
    await tabDangKy.locator('#mat-khau-2').fill(mk);
    await tabDangKy.locator('#gui').click();
    await expect(tabDangKy.locator('#tieu-de')).toHaveText('Kiểm tra email của bạn');
    await expect(tabDangKy.locator('#cx-email')).toHaveText(email);

    // mã phiên thật của tài khoản vừa tạo, đặt vào liên kết như thư xác nhận của Supabase
    const api = createClient(CFG.url, CFG.anon, { auth: { persistSession: false, autoRefreshToken: false } });
    const dn = await api.auth.signInWithPassword({ email, password: mk });
    expect(dn.error, 'tài khoản vừa đăng ký đăng nhập được').toBeNull();
    const { access_token: a, refresh_token: r } = dn.data.session;

    const tabLienKet = await c.newPage();
    await tabLienKet.goto(`/dang-nhap.html#access_token=${a}&refresh_token=${r}&expires_in=3600&token_type=bearer&type=signup`);
    await tabLienKet.waitForURL(u => u.pathname.startsWith('/chu-nuoi'), { timeout: 20_000 });
    await tabDangKy.waitForURL(u => u.pathname.startsWith('/chu-nuoi'), { timeout: 20_000 });   // tab đăng ký tự đi tiếp
  } finally { await c.close(); }
});

test('liên kết xác nhận email sai hoặc đã dùng: báo rõ và hướng dẫn đăng nhập bằng mật khẩu', async ({ browser }) => {
  const c = await ngCanhMoi(browser), p = await c.newPage();
  try {
    await p.goto('/dang-nhap.html#access_token=khong-hop-le&refresh_token=khong-hop-le&type=signup');
    await expect(p.locator('#loi')).toContainText('Liên kết xác nhận không hợp lệ');
    expect(new URL(p.url()).pathname.startsWith('/chu-nuoi')).toBe(false);
    expect(new URL(p.url()).hash, 'mã trong địa chỉ đã bị xóa khỏi thanh địa chỉ').toBe('');
  } finally { await c.close(); }
});
