import { createClient } from '@supabase/supabase-js';
import { test, expect, CFG, TK, KHU, dangNhap, ngCanhMoi } from '../helpers.js';
import { dn } from '../seed.js';
import { ok } from '../api.js';

// Phiên đăng nhập: hết phiên khi không thao tác, mất phiên giữa chừng, đăng xuất rồi bấm Back, hai tab, tài khoản bị khóa khi đang dùng.
const veTrangDangNhap = p => p.waitForURL(u => u.pathname.startsWith('/dang-nhap'), { timeout: 20_000 });
const veTrangChu = p => p.waitForURL(u => u.pathname === '/' || u.pathname === '/index.html', { timeout: 20_000 });   // đăng xuất xong về trang chủ
const dangXuat = async p => {
  await p.getByRole('button', { name: 'Đăng xuất' }).first().click();
  await p.locator('dialog.xac-nhan').getByRole('button', { name: 'Đăng xuất' }).click();
  await veTrangChu(p);
};

test('hết phiên khi không thao tác (lễ tân 30 phút): có thao tác thì được gia hạn, im lặng quá hạn thì bị đăng xuất', async ({ page }) => {
  test.setTimeout(120_000);
  await dangNhap(page, TK.le_tan, KHU.le_tan);
  await page.clock.install();
  await page.goto('/le-tan/');
  await expect(page.locator('#dem')).toBeVisible();
  await page.clock.fastForward('20:00');
  await expect(page).toHaveURL(/\/le-tan\//);                        // mới 20 phút: còn nguyên
  await page.mouse.click(300, 300);                                  // có thao tác thì tính lại từ đầu
  await page.clock.fastForward('20:00');
  await expect(page).toHaveURL(/\/le-tan\//);                        // 40 phút từ đầu nhưng mới 20 phút kể từ lần thao tác
  await page.clock.fastForward('31:00');                             // im lặng quá 30 phút
  await veTrangDangNhap(page);
  expect(page.url()).toContain('het-phien=1');
  await page.goto('/le-tan/');                                       // phiên đã bị hủy thật, không vào lại được
  await veTrangDangNhap(page);
});

test('hết phiên dài hơn cho chủ nuôi (60 phút)', async ({ page }) => {
  test.setTimeout(120_000);
  await dangNhap(page, TK.chu_nuoi, KHU.chu_nuoi);
  await page.clock.install();
  await page.goto('/chu-nuoi/');
  await page.clock.fastForward('45:00');
  await expect(page).toHaveURL(/\/chu-nuoi\//);                      // 45 phút vẫn còn
  await page.clock.fastForward('20:00');
  await veTrangDangNhap(page);
});

test('mất phiên giữa chừng (xóa dữ liệu trình duyệt): chuyển trang thì về đăng nhập, không lộ dữ liệu', async ({ page }) => {
  await dangNhap(page, TK.le_tan, KHU.le_tan);
  await page.goto('/le-tan/khach-hang.html');
  await expect(page.locator('#tim')).toBeVisible();
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.goto('/le-tan/');
  await veTrangDangNhap(page);
  await expect(page.locator('body')).not.toContainText('Lịch hôm nay');
});

test('đăng xuất rồi bấm Back: không quay lại được trang có dữ liệu', async ({ page }) => {
  await dangNhap(page, TK.le_tan, KHU.le_tan);
  await page.goto('/le-tan/khach-hang.html');
  await expect(page.locator('#tim')).toBeVisible();
  await dangXuat(page);
  await page.goBack();
  await page.waitForTimeout(1500);
  await veTrangDangNhap(page);                                        // trang bảo vệ tự đưa về đăng nhập
  await expect(page.locator('#tim')).toHaveCount(0);
  await page.goBack().catch(() => {});
  await page.waitForTimeout(1000);
  await veTrangDangNhap(page);
});

test('hai tab cùng tài khoản: đăng xuất ở tab này thì tab kia cũng không dùng tiếp được', async ({ browser }) => {
  test.setTimeout(90_000);
  const c = await ngCanhMoi(browser), a = await c.newPage();
  try {
    await dangNhap(a, TK.thu_ngan, KHU.thu_ngan);
    const b = await c.newPage();
    await b.goto('/thu-ngan/');
    await expect(b.locator('#ds-lap')).toBeVisible();
    await dangXuat(a);
    await b.reload();
    await veTrangDangNhap(b);
    await expect(b.locator('#ds-lap')).toHaveCount(0);
  } finally { await c.close(); }
});

test('admin khóa tài khoản đang dùng: lần tải trang kế tiếp bị chặn, mở khóa thì vào lại được', async ({ browser }) => {
  test.setTimeout(150_000);
  const email = `e2e-khoa-${Date.now()}@example.com`;
  const ad = (await dn(TK.admin)).c;
  const nv = createClient(CFG.url, CFG.anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const dk = await nv.auth.signUp({ email, password: CFG.matKhau, options: { data: { ho_ten: 'NV bị khóa thử', so_dien_thoai: '0911222333' } } });
  if (dk.error || !dk.data.session) throw new Error('Không tạo được nhân viên thử');
  const id = dk.data.user.id;
  ok(await ad.rpc('dat_vai_tro', { p_tai_khoan: id, p_vai_tro: 'kho' }), 'gán vai trò kho');
  const c = await ngCanhMoi(browser), p = await c.newPage();
  try {
    await dangNhap(p, { email, matKhau: CFG.matKhau }, KHU.kho);
    await expect(p.locator('#them-thuoc')).toBeVisible();
    ok(await ad.rpc('khoa_tai_khoan', { p_tai_khoan: id, p_khoa: true }), 'khóa');
    await p.goto('/kho/');
    await veTrangDangNhap(p);
    await expect(p.locator('#them-thuoc')).toHaveCount(0);
    // dù cầm sẵn phiên cũ, gọi hàm của vai trò kho cũng bị từ chối
    const r = await nv.rpc('nhap_kho', { p_thuoc: '00000000-0000-0000-0000-000000000000', p_so_lo: 'KHOA', p_han_dung: '2035-12-31', p_so_luong: 1 });
    expect(r.error, 'tài khoản bị khóa không gọi được hàm kho').toBeTruthy();
    ok(await ad.rpc('khoa_tai_khoan', { p_tai_khoan: id, p_khoa: false }), 'mở khóa');
    await dangNhap(p, { email, matKhau: CFG.matKhau }, KHU.kho);
    await expect(p.locator('#them-thuoc')).toBeVisible();
  } finally { await c.close(); }
});
