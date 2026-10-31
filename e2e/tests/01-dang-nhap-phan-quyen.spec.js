import { test, expect, TK, VAI, KHU, dangNhap } from '../helpers.js';

test.describe('Đăng nhập', () => {
  test('mật khẩu sai báo lỗi và không vào được', async ({ page }) => {
    await page.goto('/dang-nhap.html');
    await page.locator('#email').fill(TK.le_tan.email);
    await page.locator('#mat-khau').fill('mat-khau-sai-12345');
    await page.locator('#gui').click();
    await expect(page.locator('#loi')).toBeVisible();
    await expect(page).toHaveURL(/dang-nhap/);
  });

  test('nút con mắt hiện và ẩn mật khẩu', async ({ page }) => {
    await page.goto('/dang-nhap.html');
    const o = page.locator('#mat-khau');
    await expect(o).toHaveAttribute('type', 'password');
    await page.locator('.o-mk-nut').first().click();
    await expect(o).toHaveAttribute('type', 'text');
    await page.locator('.o-mk-nut').first().click();
    await expect(o).toHaveAttribute('type', 'password');
  });
});

test.describe('Mỗi vai trò đăng nhập vào đúng khu của mình', () => {
  for (const v of [...VAI, 'admin']) {
    test(`${v} vào ${KHU[v]}`, async ({ page }) => {
      await dangNhap(page, TK[v], KHU[v]);
      await expect(page.locator('.thanh-ben')).toBeVisible();
      await expect(page.locator('#loi-chung')).toBeHidden();
    });
  }
});

test.describe('Phân quyền: vào khu không phải của mình thì bị đưa về khu của mình', () => {
  const KHAC = { le_tan: ['/admin/', '/bac-si/', '/thu-ngan/', '/kho/', '/chu-nuoi/'], bac_si: ['/admin/', '/le-tan/', '/thu-ngan/', '/kho/', '/chu-nuoi/'],
                 thu_ngan: ['/admin/', '/le-tan/', '/bac-si/', '/kho/', '/chu-nuoi/'], kho: ['/admin/', '/le-tan/', '/bac-si/', '/thu-ngan/', '/chu-nuoi/'],
                 chu_nuoi: ['/admin/', '/le-tan/', '/bac-si/', '/thu-ngan/', '/kho/'] };
  for (const [v, ds] of Object.entries(KHAC)) {
    test(`${v} không ở lại được khu của vai trò khác`, async ({ page }) => {
      await dangNhap(page, TK[v], KHU[v]);
      const khuMinh = KHU[v].replace(/\/$/, '');
      for (const d of ds) {
        // WebKit báo lỗi khi trang tự chuyển hướng giữa lúc đang tải; điều cần kiểm tra là địa chỉ cuối cùng.
        await page.goto(d).catch(e => { if (!/interrupted by another navigation/.test(String(e.message))) throw e; });
        await page.waitForURL(u => u.pathname.startsWith(khuMinh), { timeout: 15_000 });
      }
    });
  }

  test('khách chưa đăng nhập vào khu nhân viên thì về trang đăng nhập', async ({ page }) => {
    for (const d of ['/admin/', '/le-tan/', '/bac-si/', '/thu-ngan/', '/kho/', '/chu-nuoi/', '/trao-doi.html']) {
      await page.goto(d);
      await page.waitForURL(/dang-nhap/, { timeout: 15_000 });
    }
  });

  test('chủ nuôi không đọc được dữ liệu nhạy cảm qua API', async ({ page }) => {
    await dangNhap(page, TK.chu_nuoi, KHU.chu_nuoi);
    const kq = await page.evaluate(async () => {
      const d = Pethy.db, ra = {};
      for (const b of ['tai_khoan', 'ho_so_kham', 'don_thuoc', 'nhat_ky', 'tin_nhan', 'thanh_toan']) { const r = await d.from(b).select('*').limit(5); ra[b] = r.error ? 'loi' : (r.data || []).length; }
      const tk = await d.rpc('danh_sach_tai_khoan'); ra.danh_sach_tai_khoan = tk.error ? 'bi_chan' : 'doc_duoc';
      return ra;
    });
    expect(kq.danh_sach_tai_khoan).toBe('bi_chan');
    // nhật ký và tin nhắn nội bộ: chủ nuôi không đọc được dòng nào. Hồ sơ khám, đơn thuốc, thanh toán: chỉ phần của chính mình
    // (số dòng phụ thuộc dữ liệu các test khác đã tạo; việc không thấy dữ liệu người khác được kiểm ở 14-co-lap-giua-chu-nuoi).
    for (const b of ['nhat_ky', 'tin_nhan']) expect(kq[b], b).not.toBeGreaterThan(0);
    expect(kq.tai_khoan, 'chủ nuôi chỉ thấy chính mình').toBeLessThanOrEqual(1);
  });
});
