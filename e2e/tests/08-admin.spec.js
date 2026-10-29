import { test, expect, CFG, TK, KHU, dangNhap, ngCanhMoi } from '../helpers.js';
import { chuanBiDuLieuDatLich, dn } from '../seed.js';

const hop = p => p.locator('#hop');
const xn = p => p.locator('dialog.xac-nhan');
const mo = async (browser, tk, khu) => { const c = await ngCanhMoi(browser); const p = await c.newPage(); await dangNhap(p, tk, khu); return { c, p }; };

test('admin quản lý dịch vụ: kiểm tra đầu vào, sửa giá, mô tả, ngừng thì khách không còn thấy', async ({ browser }) => {
  test.setTimeout(120_000);
  await chuanBiDuLieuDatLich();
  const ten = 'Dịch vụ thử ' + Date.now().toString().slice(-6);
  const ad = await mo(browser, TK.admin, KHU.admin), cn = await mo(browser, TK.chu_nuoi, KHU.chu_nuoi);
  try {
    const p = ad.p;
    await p.goto('/admin/dich-vu.html');
    await p.getByRole('button', { name: 'Thêm dịch vụ' }).click();
    await hop(p).getByRole('button', { name: 'Thêm', exact: true }).click();
    await expect(hop(p).locator('.loi')).toContainText('nhập tên');
    await p.locator('#d-t').fill(ten); await p.locator('#d-g').fill('-5');
    await hop(p).getByRole('button', { name: 'Thêm', exact: true }).click();
    await expect(hop(p).locator('.loi')).toContainText('Giá phải là số');
    await p.locator('#d-g').fill('90000');
    await hop(p).getByRole('button', { name: 'Thêm', exact: true }).click();
    await expect(hop(p)).not.toBeVisible();
    const dong = p.locator('.hang', { hasText: ten });
    await expect(dong).toHaveCount(1);

    // trùng tên bị từ chối
    await p.getByRole('button', { name: 'Thêm dịch vụ' }).click();
    await p.locator('#d-t').fill(ten); await p.locator('#d-g').fill('1000');
    await hop(p).getByRole('button', { name: 'Thêm', exact: true }).click();
    await expect(hop(p).locator('.loi')).toContainText('đã tồn tại');
    await hop(p).getByRole('button', { name: 'Đóng' }).click();

    // sửa giá, giá sai bị chặn
    const o = dong.locator('input');
    await o.fill('abc'); await dong.getByRole('button', { name: 'Lưu giá' }).click();
    await expect(p.locator('#loi-chung')).toContainText('Giá phải là số');
    await o.fill('120000'); await dong.getByRole('button', { name: 'Lưu giá' }).click();
    await p.reload();
    await expect(p.locator('.hang', { hasText: ten }).locator('input')).toHaveValue('120000');

    // mô tả
    await p.locator('.hang', { hasText: ten }).getByRole('button', { name: 'Mô tả' }).click();
    await p.locator('#d-mt').fill('Mô tả thử tự động');
    await hop(p).getByRole('button', { name: 'Lưu mô tả' }).click();
    await expect(hop(p)).not.toBeVisible();
    await expect(p.locator('.hang', { hasText: ten })).not.toContainText('chưa có mô tả');

    // khách thấy dịch vụ khi đang áp dụng
    await cn.p.goto('/chu-nuoi/dat-lich.html');
    await expect(cn.p.locator('label.chon', { hasText: ten })).toHaveCount(1);
    // ngừng thì khách không còn thấy
    await p.locator('.hang', { hasText: ten }).getByRole('button', { name: 'Ngừng' }).click();
    await expect(p.locator('.hang', { hasText: ten })).toContainText('Đã ngừng');
    await cn.p.reload();
    await expect(cn.p.locator('label.chon', { hasText: ten })).toHaveCount(0);
    await p.locator('.hang', { hasText: ten }).getByRole('button', { name: 'Áp dụng lại' }).click();
    await expect(p.locator('.hang', { hasText: ten })).not.toContainText('Đã ngừng');
  } finally { await ad.c.close(); await cn.c.close(); }
});

test('admin chỉnh tham số: giá trị sai bị chặn; bật bảo trì thì người dùng khác bị chặn, admin vẫn vào', async ({ browser }) => {
  test.setTimeout(120_000);
  const ad = await mo(browser, TK.admin, KHU.admin);
  const adApi = (await dn(TK.admin)).c;
  try {
    const p = ad.p;
    await p.goto('/admin/tham-so.html');
    const o = p.getByLabel('dat_truoc_toi_da_ngay');
    await o.fill('abc'); await o.locator('xpath=following::button[1]').click();
    await expect(p.locator('#loi-chung')).toContainText('số nguyên dương');
    await o.fill('0'); await o.locator('xpath=following::button[1]').click();
    await expect(p.locator('#loi-chung')).toContainText('số nguyên dương');
    await o.fill('45'); await o.locator('xpath=following::button[1]').click();
    await p.reload();
    await expect(p.getByLabel('dat_truoc_toi_da_ngay')).toHaveValue('45');
    await p.getByLabel('dat_truoc_toi_da_ngay').fill('30');
    await p.getByLabel('dat_truoc_toi_da_ngay').locator('xpath=following::button[1]').click();
    await p.reload();
    await expect(p.getByLabel('dat_truoc_toi_da_ngay')).toHaveValue('30');

    // chế độ bảo trì
    try {
      await p.getByRole('button', { name: /Bật/ }).first().click();
      await xn(p).getByRole('button', { name: /^Bật/ }).click();
      await expect(p.getByText('Đang bật')).toBeVisible();
      const c2 = await ngCanhMoi(browser), q = await c2.newPage();
      await q.goto('/dang-nhap.html');
      await q.locator('#email').fill(TK.le_tan.email); await q.locator('#mat-khau').fill(TK.le_tan.matKhau); await q.locator('#gui').click();
      await q.waitForTimeout(5000);
      expect(new URL(q.url()).pathname.startsWith('/le-tan'), 'lễ tân không được vào khi đang bảo trì').toBe(false);
      await c2.close();
      await p.goto('/admin/');                       // admin vẫn vào được
      await expect(p).toHaveURL(/\/admin\//);
    } finally {
      await adApi.from('cau_hinh').update({ gia_tri: 'false' }).eq('khoa', 'che_do_bao_tri');   // luôn tắt để không ảnh hưởng test khác
    }
    await p.goto('/admin/tham-so.html');
    await expect(p.getByText('Đang tắt')).toBeVisible();
  } finally { await ad.c.close(); }
});

test('admin thêm nhân viên bằng giao diện, nhân viên đăng nhập được, rồi đổi vai trò, khóa, mở khóa, xóa', async ({ browser }) => {
  test.setTimeout(180_000);
  const email = `e2e-nv-${Date.now()}@example.com`, ten = 'Nhân viên thử ' + Date.now().toString().slice(-5);
  const ad = await mo(browser, TK.admin, KHU.admin);
  try {
    const p = ad.p;
    await p.goto('/admin/tai-khoan.html');
    await expect(p.locator('.hang', { hasText: '(bạn)' })).toHaveCount(1);
    await expect(p.locator('.hang', { hasText: '(bạn)' }).getByRole('button', { name: 'Xóa' })).toHaveCount(0);   // không tự xóa/khóa mình
    await p.locator('#them-nv').click();
    await p.locator('#nv-ten').fill(ten);
    await p.locator('#nv-mail').fill('khong-hop-le');
    await p.locator('#nv-vt').selectOption('le_tan');
    const matKhau = await p.locator('#nv-mk').inputValue();
    await hop(p).getByRole('button', { name: 'Tạo tài khoản' }).click();
    await expect(hop(p).locator('.loi')).toContainText('Email');
    await p.locator('#nv-mail').fill(email);
    await hop(p).getByRole('button', { name: 'Tạo tài khoản' }).click();
    await expect(xn(p)).toContainText(matKhau);
    await xn(p).getByRole('button').last().click();
    const dong = p.locator('.hang', { hasText: email });
    await expect(dong).toHaveCount(1);
    await expect(dong.getByLabel(/Vai trò của/)).toHaveValue('le_tan');

    // nhân viên mới đăng nhập vào đúng khu
    const nv = await mo(browser, { email, matKhau }, KHU.le_tan);
    await nv.c.close();

    // đổi vai trò (có hộp xác nhận)
    await dong.getByLabel(/Vai trò của/).selectOption('kho');
    await xn(p).getByRole('button', { name: 'Đổi vai trò' }).click();
    await p.reload();
    await expect(p.locator('.hang', { hasText: email }).getByLabel(/Vai trò của/)).toHaveValue('kho');

    // khóa: nhãn "Đã khóa", không đăng nhập dùng được; mở khóa thì hết nhãn
    await p.locator('.hang', { hasText: email }).getByRole('button', { name: 'Khóa' }).click();
    await xn(p).getByRole('button', { name: 'Có, khóa' }).click();
    await expect(p.locator('.hang', { hasText: email })).toContainText('Đã khóa');
    const c3 = await ngCanhMoi(browser), q = await c3.newPage();
    await q.goto('/dang-nhap.html');
    await q.locator('#email').fill(email); await q.locator('#mat-khau').fill(matKhau); await q.locator('#gui').click();
    await q.waitForTimeout(5000);
    expect(new URL(q.url()).pathname.startsWith('/kho'), 'tài khoản bị khóa không được vào khu làm việc').toBe(false);
    await c3.close();
    await p.locator('.hang', { hasText: email }).getByRole('button', { name: 'Mở khóa' }).click();
    await expect(p.locator('.hang', { hasText: email })).not.toContainText('Đã khóa');

    // xóa
    await p.locator('.hang', { hasText: email }).getByRole('button', { name: 'Xóa' }).click();
    await xn(p).getByRole('button', { name: 'Có, xóa tài khoản' }).click();
    await expect(p.locator('.hang', { hasText: email })).toHaveCount(0);
  } finally { await ad.c.close(); }
});

test('admin thêm và xóa ca làm việc; giờ sai bị chặn', async ({ browser }) => {
  await chuanBiDuLieuDatLich();
  const ad = await mo(browser, TK.admin, KHU.admin);
  try {
    const p = ad.p;
    await p.goto('/admin/lich-lam-viec.html');
    const muc = p.locator('section.muc', { hasText: TK.bac_si.ten });
    await expect(muc).toHaveCount(1);
    const truoc = await muc.locator('.hang').count();
    await muc.getByRole('button', { name: 'Thêm ca' }).click();
    await p.locator('#c-t').selectOption('7');
    await p.locator('#c-a').fill('19:00'); await p.locator('#c-b').fill('18:00');
    await hop(p).getByRole('button', { name: 'Thêm', exact: true }).click();
    await expect(hop(p).locator('.loi')).toContainText('sau giờ bắt đầu');
    await p.locator('#c-b').fill('20:00');
    await hop(p).getByRole('button', { name: 'Thêm', exact: true }).click();
    await expect(hop(p)).not.toBeVisible();
    await expect(muc.locator('.hang')).toHaveCount(truoc + 1);
    await expect(muc.locator('.hang', { hasText: '19:00 đến 20:00' })).toHaveCount(1);
    await muc.locator('.hang', { hasText: '19:00 đến 20:00' }).getByRole('button', { name: /Xóa/ }).click();
    await xn(p).getByRole('button', { name: 'Xóa ca' }).click();
    await expect(muc.locator('.hang')).toHaveCount(truoc);
  } finally { await ad.c.close(); }
});

test('các trang quản trị tải được, không lỗi JavaScript, nhật ký ghi lại thao tác của admin', async ({ page }) => {
  const loi = [];
  page.on('pageerror', e => loi.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/favicon/.test(m.text())) loi.push(m.text()); });
  await dangNhap(page, TK.admin, KHU.admin);
  for (const t of ['', 'doanh-thu', 'danh-gia', 'bao-mat', 'nhat-ky', 'bai-viet', 'tham-so', 'tai-khoan', 'dich-vu', 'lich-lam-viec', 'trao-doi']) {
    await page.goto('/admin/' + (t ? t + '.html' : ''));
    await expect(page.locator('#loi-chung')).toBeHidden({ timeout: 10_000 });
    await page.waitForLoadState('networkidle');
  }
  await page.goto('/admin/nhat-ky.html');
  await expect(page.locator('.hang').first()).toBeVisible();
  expect(loi, 'lỗi JavaScript hoặc lỗi mạng trên các trang quản trị').toEqual([]);
});

test('không phải admin thì không ghi được dịch vụ, tham số, lịch làm việc hay đổi vai trò qua API', async () => {
  for (const tk of [TK.chu_nuoi, TK.le_tan, TK.bac_si, TK.thu_ngan, TK.kho]) {
    const { c, id } = await dn(tk);
    const t = tk.email;
    expect((await c.from('dich_vu').insert({ ten: 'Lén ' + t, loai: 'kham', gia: 1 })).error, 'insert dich_vu ' + t).toBeTruthy();
    const up = await c.from('cau_hinh').update({ gia_tri: 'true' }).eq('khoa', 'che_do_bao_tri').select();
    expect(up.error || !(up.data || []).length, 'update cau_hinh ' + t).toBeTruthy();
    expect((await c.from('lich_lam_viec').insert({ bac_si_id: id, thu_trong_tuan: 1, gio_bat_dau: '01:00', gio_ket_thuc: '02:00' })).error, 'insert lich_lam_viec ' + t).toBeTruthy();
    expect((await c.rpc('dat_vai_tro', { p_tai_khoan: id, p_vai_tro: 'admin' })).error, 'dat_vai_tro ' + t).toBeTruthy();
    expect((await c.rpc('danh_sach_tai_khoan')).error, 'danh_sach_tai_khoan ' + t).toBeTruthy();
    expect((await c.rpc('xoa_tai_khoan', { p_tai_khoan: id })).error, 'xoa_tai_khoan ' + t).toBeTruthy();
  }
});
