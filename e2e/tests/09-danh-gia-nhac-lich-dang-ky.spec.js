import { test, expect, TK, KHU, dangNhap, ngCanhMoi } from '../helpers.js';
import { chuanBiDuLieuTiem, dn, DV, DV_TIEM, VACCINE } from '../seed.js';
import { ngayVN } from './../luong.js';

const ok = (r, viec) => { if (r.error) throw new Error(`${viec}: ${r.error.message}`); return r.data; };
const mo = async (browser, tk, khu) => { const c = await ngCanhMoi(browser); const p = await c.newPage(); await dangNhap(p, tk, khu); return { c, p }; };

// Dựng nhanh trạng thái bằng API (mỗi bước do đúng vai trò), để kịch bản giao diện chỉ tập trung vào phần cần thử.
async function chuanBi({ tiem = false, ngay, tenThuCung }){
  const cn = await dn(TK.chu_nuoi), lt = (await dn(TK.le_tan)).c, bs = await dn(TK.bac_si);
  const chu = ok(await cn.c.from('chu_nuoi').select('id').limit(1), 'đọc hồ sơ chủ nuôi')[0];
  const pet = ok(await cn.c.from('thu_cung').insert({ chu_nuoi_id: chu.id, ten: tenThuCung, loai: 'Chó' }).select('id'), 'thêm thú cưng')[0];
  const dv = ok(await cn.c.from('dich_vu').select('id').eq('ten', tiem ? DV_TIEM.ten : DV.ten), 'đọc dịch vụ')[0];
  const vc = tiem ? ok(await cn.c.from('thuoc').select('id').eq('ten', VACCINE.ten), 'đọc vaccine')[0] : null;
  const gio = ok(await cn.c.rpc('khung_gio_trong', { p_bac_si: bs.id, p_ngay: ngay }), 'khung giờ trống');
  if (!gio.length) throw new Error('Bác sĩ thử không còn giờ trống ngày ' + ngay);
  const lich = ok(await cn.c.rpc('dat_lich', { p_thu_cung: pet.id, p_bac_si: bs.id, p_dich_vu: dv.id, p_thoi_gian: gio[gio.length - 1].thoi_gian, p_vaccine: vc ? vc.id : null, p_ghi_chu: null }), 'đặt lịch');
  ok(await lt.rpc('xac_nhan_lich', { p_lich: lich }), 'xác nhận lịch');
  return { cn, lt, bs, petId: pet.id, lichId: lich };
}
async function khamXong({ bs, lichId }){
  ok(await bs.c.rpc('ghi_ho_so_kham', { p_lich: lichId, p_chan_doan: 'Khám thử', p_can_nang: null, p_nhiet_do: null, p_ghi_chu: null }), 'ghi hồ sơ khám');
}

test('chủ nuôi đánh giá lần khám; admin ẩn rồi hiện lại; HTML trong nhận xét không chạy', async ({ browser }) => {
  test.setTimeout(150_000);
  await chuanBiDuLieuTiem();
  const ten = 'Sao' + Date.now().toString().slice(-6), nx = 'Bác sĩ rất tận tâm <b>đậm</b> ' + ten;
  const s = await chuanBi({ ngay: ngayVN(20), tenThuCung: ten });
  await khamXong(s);
  const cn = await mo(browser, TK.chu_nuoi, KHU.chu_nuoi), ad = await mo(browser, TK.admin, KHU.admin);
  try {
    const dong = cn.p.locator('#ds-da-kham .dong', { hasText: ten });
    await expect(dong).toHaveCount(1);
    await dong.getByRole('button', { name: 'Đánh giá' }).click();
    const hop = cn.p.locator('dialog.hop-dg');
    await hop.getByRole('button', { name: 'Gửi đánh giá' }).click();
    await expect(hop.locator('.loi')).toContainText('chọn số sao');         // chưa chọn sao thì không gửi
    await hop.locator('.dg-sao').nth(4).click();
    await expect(hop).toContainText('Rất hài lòng');
    await hop.locator('#dg-nx').fill(nx);
    await hop.getByRole('button', { name: 'Gửi đánh giá' }).click();
    await expect(hop).toHaveCount(0);
    await expect(dong.getByRole('button', { name: 'Sửa' })).toBeVisible();
    await expect(dong.locator('[aria-label="5 trên 5 sao"]')).toBeVisible();

    // sửa lại thành 4 sao, vẫn chỉ một đánh giá cho lần khám
    await dong.getByRole('button', { name: 'Sửa' }).click();
    await cn.p.locator('dialog.hop-dg .dg-sao').nth(3).click();
    await cn.p.locator('dialog.hop-dg').getByRole('button', { name: 'Lưu đánh giá' }).click();
    await expect(dong.locator('[aria-label="4 trên 5 sao"]')).toBeVisible();

    // admin thấy nguyên văn (không thành chữ đậm), ẩn rồi hiện lại
    const p = ad.p;
    await p.goto('/admin/danh-gia.html');
    const d = p.locator('.hang', { hasText: ten });
    await expect(d).toHaveCount(1);
    await expect(d).toContainText('<b>đậm</b>');
    await expect(d.locator('b')).toHaveCount(0);
    await d.getByRole('button', { name: 'Ẩn' }).click();
    await p.locator('dialog.xac-nhan').getByRole('button', { name: 'Có, ẩn đánh giá' }).click();
    await expect(d).toContainText('Đã ẩn');
    await d.getByRole('button', { name: 'Hiện lại' }).click();
    await expect(d).not.toContainText('Đã ẩn');
  } finally { await cn.c.close(); await ad.c.close(); }
});

test('đánh giá chỉ hợp lệ khi đúng người, đúng lần khám, đúng số sao (qua API)', async () => {
  const cn = (await dn(TK.chu_nuoi)).c, id = '00000000-0000-0000-0000-000000000000';
  expect((await cn.rpc('gui_danh_gia', { p_lich: id, p_so_sao: 5, p_nhan_xet: null })).error, 'lịch không tồn tại').toBeTruthy();
  expect((await cn.rpc('gui_danh_gia', { p_lich: id, p_so_sao: 6, p_nhan_xet: null })).error, 'sao > 5').toBeTruthy();
  expect((await cn.rpc('gui_danh_gia', { p_lich: id, p_so_sao: 0, p_nhan_xet: null })).error, 'sao < 1').toBeTruthy();
  for (const tk of [TK.le_tan, TK.bac_si, TK.thu_ngan, TK.kho]) {
    const { c } = await dn(tk);
    expect((await c.rpc('gui_danh_gia', { p_lich: id, p_so_sao: 5, p_nhan_xet: null })).error, 'gui_danh_gia với ' + tk.email).toBeTruthy();
    expect((await c.rpc('an_hien_danh_gia', { p_id: id, p_hien: false })).error, 'an_hien_danh_gia với ' + tk.email).toBeTruthy();
  }
});

test('lễ tân thấy việc cần nhắc (lịch sắp tới và mũi tiêm sắp đến hạn), ghi nhận đã gọi thì biến mất', async ({ browser }) => {
  test.setTimeout(150_000);
  await chuanBiDuLieuTiem();
  const a = 'Nhac' + Date.now().toString().slice(-6), b = 'Tiem' + Date.now().toString().slice(-6);
  const s1 = await chuanBi({ ngay: ngayVN(1), tenThuCung: a });                       // lịch ngày mai: cần nhắc trong 2 ngày tới
  const s2 = await chuanBi({ ngay: ngayVN(2), tiem: true, tenThuCung: b });           // lịch tiêm, bác sĩ ghi mũi tiêm, hẹn mũi sau 3 ngày nữa
  ok(await s2.bs.c.rpc('ghi_tiem', { p_lich: s2.lichId, p_ngay_tiem_tiep: ngayVN(3), p_vaccine: ok(await s2.cn.c.from('thuoc').select('id').eq('ten', VACCINE.ten), 'đọc vaccine')[0].id }), 'ghi mũi tiêm');
  const lt = await mo(browser, TK.le_tan, KHU.le_tan);
  try {
    const p = lt.p;
    const n1 = p.locator('#ds-nhac .nhac', { hasText: a });
    await expect(n1).toHaveCount(1);
    await n1.getByRole('button', { name: 'Đã gọi' }).click();
    await expect(p.locator('#ds-nhac .nhac', { hasText: a })).toHaveCount(0);
    const n2 = p.locator('#ds-nhac .nhac', { hasText: b });
    await expect(n2).toHaveCount(1);
    await expect(n2).toContainText('Tiêm ' + VACCINE.ten);
    await n2.getByRole('button', { name: 'Đã email' }).click();
    await expect(p.locator('#ds-nhac .nhac', { hasText: b })).toHaveCount(0);
    await p.reload();                                                                      // vẫn không hiện lại sau khi tải lại
    await expect(p.locator('#ds-nhac .nhac', { hasText: a })).toHaveCount(0);
    await expect(p.locator('#ds-nhac .nhac', { hasText: b })).toHaveCount(0);
  } finally { await lt.c.close(); }
  // chủ nuôi không đọc được danh sách nhắc của phòng khám
  const r = await s1.cn.c.from('lich_can_nhac').select('*');
  expect((r.data || []).length, 'chủ nuôi không được thấy lịch nhắc').toBe(0);
});

test('đăng ký tài khoản chủ nuôi: kiểm tra đầu vào, tạo được, vào đúng khu; email trùng bị từ chối; quên mật khẩu báo chung', async ({ browser }) => {
  test.setTimeout(120_000);
  const email = `e2e-dk-${Date.now()}@example.com`, mk = 'Matkhau' + Date.now().toString().slice(-6) + 'A1';
  const c = await ngCanhMoi(browser), p = await c.newPage();
  try {
    await p.goto('/dang-nhap.html?dang-ky');
    await expect(p.locator('#tieu-de')).toHaveText('Tạo tài khoản');
    await p.locator('#ho-ten').fill('Người đăng ký thử');
    await p.locator('#sdt').fill('0912345678');
    await p.locator('#email').fill(email);
    await p.locator('#mat-khau').fill(mk);
    await p.locator('#mat-khau-2').fill(mk + 'x');
    await p.locator('#gui').click();
    await expect(p.locator('#loi')).toContainText('chưa giống nhau');
    await p.locator('#mat-khau-2').fill(mk);
    await p.locator('#sdt').fill('123');
    await p.locator('#gui').click();
    await expect(p.locator('#loi')).toContainText('Số điện thoại');
    await p.locator('#sdt').fill('0912345678');
    await p.locator('#gui').click();
    await p.waitForURL(u => u.pathname.startsWith('/chu-nuoi'), { timeout: 20_000 });
  } finally { await c.close(); }

  // email đã có tài khoản
  const c2 = await ngCanhMoi(browser), q = await c2.newPage();
  try {
    await q.goto('/dang-nhap.html?dang-ky');
    await q.locator('#ho-ten').fill('Người trùng'); await q.locator('#sdt').fill('0912345679');
    await q.locator('#email').fill(email); await q.locator('#mat-khau').fill(mk); await q.locator('#mat-khau-2').fill(mk);
    await q.locator('#gui').click();
    await expect(q.locator('#loi')).toBeVisible();
    expect(new URL(q.url()).pathname.startsWith('/chu-nuoi')).toBe(false);

    // quên mật khẩu: thông báo chung dù email có tồn tại hay không
    await q.goto('/dang-nhap.html');
    await q.locator('#quen').click();
    await expect(q.locator('#tieu-de')).toHaveText('Quên mật khẩu');
    await expect(q.locator('#mat-khau')).toBeHidden();
    await q.locator('#email').fill('khong-phai-email'); await q.locator('#gui').click();
    await expect(q.locator('#loi')).toContainText('email');
    await q.locator('#email').fill(`khong-ton-tai-${Date.now()}@example.com`); await q.locator('#gui').click();
    await expect(q.locator('#thong-bao')).toContainText('Nếu email này đã có tài khoản');
    await q.locator('#quay').click();
    await expect(q.locator('#tieu-de')).toHaveText('Đăng nhập');
  } finally { await c2.close(); }
});
