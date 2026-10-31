import { createClient } from '@supabase/supabase-js';
import { test, expect, CFG, TK, KHU, dangNhap, ngCanhMoi } from '../helpers.js';
import { chuanBiDuLieuDatLich, dn, DV, THUOC } from '../seed.js';
import { ngayVN } from '../luong.js';
import { ok, goiCoCho } from '../api.js';

// Hai khách khác nhau: khách B không được thấy, sửa, xóa hay dùng bất cứ thứ gì của khách A,
// dù gọi thẳng API hay mở thẳng địa chỉ trang.
const taoKhach = async (ten, sdt) => {
  const c = createClient(CFG.url, CFG.anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const email = `e2e-khach-${ten}-${Date.now()}@example.com`;
  const r = await c.auth.signUp({ email, password: CFG.matKhau, options: { data: { ho_ten: 'Khách ' + ten, so_dien_thoai: sdt } } });
  if (r.error || !r.data.session) throw new Error('Không tạo được khách ' + ten + ': ' + (r.error ? r.error.message : 'cần xác nhận email'));
  return { c, email, id: r.data.user.id };
};
const BANG = ['chu_nuoi', 'thu_cung', 'lich_hen', 'ho_so_kham', 'don_thuoc', 'ct_don_thuoc', 'mui_tiem', 'hoa_don', 'ct_hoa_don', 'thanh_toan', 'danh_gia'];

test('khách B không thấy, sửa, xóa hay dùng dữ liệu của khách A (API)', async () => {
  test.setTimeout(240_000);
  await chuanBiDuLieuDatLich();
  const hau = Date.now().toString().slice(-6);
  const A = await taoKhach('A', '091' + hau + '1'), B = await taoKhach('B', '092' + hau + '2');
  const lt = (await dn(TK.le_tan)).c, bs = await dn(TK.bac_si), tn = (await dn(TK.thu_ngan)).c, ad = (await dn(TK.admin)).c;
  const chuA = ok(await A.c.from('chu_nuoi').select('id').limit(1), 'chủ nuôi A')[0];
  const chuB = ok(await B.c.from('chu_nuoi').select('id').limit(1), 'chủ nuôi B')[0];
  expect(chuA.id).not.toBe(chuB.id);

  // khách A có đủ dữ liệu: thú cưng, lịch đã khám có đơn thuốc, hóa đơn đã thu, đánh giá
  const petA = ok(await A.c.from('thu_cung').insert({ chu_nuoi_id: chuA.id, ten: 'Bí mật của A ' + hau, loai: 'Chó' }).select('id'), 'thú cưng A')[0];
  const dv = ok(await A.c.from('dich_vu').select('id').eq('ten', DV.ten), 'dịch vụ')[0];
  const thuoc = ok(await ad.from('thuoc').select('id').eq('ten', THUOC.ten), 'thuốc')[0];
  const gio = await goiCoCho(() => A.c.rpc('khung_gio_trong', { p_bac_si: bs.id, p_ngay: ngayVN(18) }), 'giờ trống');
  const lichA = await goiCoCho(() => A.c.rpc('dat_lich', { p_thu_cung: petA.id, p_bac_si: bs.id, p_dich_vu: dv.id, p_thoi_gian: gio[gio.length - 1].thoi_gian, p_vaccine: null, p_ghi_chu: 'ghi chú riêng tư của A' }), 'đặt lịch A');
  ok(await lt.rpc('xac_nhan_lich', { p_lich: lichA }), 'xác nhận');
  const hs = ok(await bs.c.rpc('ghi_ho_so_kham', { p_lich: lichA, p_chan_doan: 'Chẩn đoán riêng tư của A', p_can_nang: 5, p_nhiet_do: 38, p_ghi_chu: null }), 'khám');
  ok(await bs.c.rpc('ke_don', { p_ho_so: hs, p_dong: [{ thuoc_id: thuoc.id, so_luong: 1, lieu_dung: 'Ngày 1 lần' }] }), 'kê đơn');
  const hd = ok(await tn.rpc('lap_hoa_don', { p_lich: lichA }), 'hóa đơn');
  ok(await tn.rpc('ghi_thanh_toan', { p_hoa_don: hd, p_so_tien: 1000, p_phuong_thuc: 'tien_mat' }), 'thu tiền');
  ok(await A.c.rpc('gui_danh_gia', { p_lich: lichA, p_so_sao: 5, p_nhan_xet: 'Nhận xét của A' }), 'đánh giá A');

  // A thấy dữ liệu của mình (đảm bảo phép thử có ý nghĩa)
  for (const b of ['thu_cung', 'lich_hen', 'ho_so_kham', 'hoa_don', 'thanh_toan']) expect((await A.c.from(b).select('id')).data.length, 'A thấy ' + b + ' của mình').toBeGreaterThan(0);

  // B không thấy gì của A ở mọi bảng
  for (const b of BANG) {
    const r = await B.c.from(b).select('*');
    expect(r.error, 'đọc ' + b).toBeNull();
    const chuoi = JSON.stringify(r.data);
    expect(chuoi, 'B không thấy dữ liệu A trong ' + b).not.toContain(petA.id);
    expect(chuoi).not.toContain(lichA);
    expect(chuoi).not.toContain('riêng tư');
    expect(chuoi).not.toContain(chuA.id);
  }
  // đọc thẳng theo mã
  for (const [b, cot, v] of [['thu_cung', 'id', petA.id], ['lich_hen', 'id', lichA], ['ho_so_kham', 'lich_hen_id', lichA], ['hoa_don', 'id', hd], ['thanh_toan', 'hoa_don_id', hd], ['danh_gia', 'lich_hen_id', lichA], ['chu_nuoi', 'id', chuA.id]])
    expect((await B.c.from(b).select('*').eq(cot, v)).data, 'đọc thẳng ' + b).toHaveLength(0);

  // B không sửa, không xóa được
  const sua = await B.c.from('thu_cung').update({ ten: 'Bị B đổi tên' }).eq('id', petA.id).select();
  expect(sua.error || sua.data.length === 0, 'sửa thú cưng của A').toBeTruthy();
  const xoa = await B.c.from('thu_cung').delete().eq('id', petA.id).select();
  expect(xoa.error || xoa.data.length === 0, 'xóa thú cưng của A').toBeTruthy();
  const sdt = await B.c.from('chu_nuoi').update({ so_dien_thoai: '0999999999' }).eq('id', chuA.id).select();
  expect(sdt.error || sdt.data.length === 0, 'đổi số điện thoại của A').toBeTruthy();
  // B không thêm thú cưng cho A
  expect((await B.c.from('thu_cung').insert({ chu_nuoi_id: chuA.id, ten: 'Nhét vào A', loai: 'Mèo' })).error, 'thêm thú cưng cho A').toBeTruthy();
  // B không đặt, đổi, hủy, đánh giá, xem hồ sơ thay A
  const g = await goiCoCho(() => B.c.rpc('khung_gio_trong', { p_bac_si: bs.id, p_ngay: ngayVN(19) }), 'giờ trống B');
  expect((await B.c.rpc('dat_lich', { p_thu_cung: petA.id, p_bac_si: bs.id, p_dich_vu: dv.id, p_thoi_gian: g[0].thoi_gian, p_vaccine: null, p_ghi_chu: null })).error, 'đặt lịch cho thú cưng của A').toBeTruthy();
  expect((await B.c.rpc('doi_lich', { p_lich: lichA, p_thoi_gian: g[0].thoi_gian, p_bac_si: null })).error, 'đổi lịch của A').toBeTruthy();
  expect((await B.c.rpc('huy_lich', { p_lich: lichA, p_ly_do: 'B hủy' })).error, 'hủy lịch của A').toBeTruthy();
  expect((await B.c.rpc('gui_danh_gia', { p_lich: lichA, p_so_sao: 1, p_nhan_xet: 'B phá' })).error, 'đánh giá thay A').toBeTruthy();
  expect((await B.c.rpc('xem_ho_so_kham', { p_thu_cung: petA.id })).error, 'xem hồ sơ khám của A').toBeTruthy();
  // dữ liệu của A không đổi
  const lai = ok(await A.c.from('thu_cung').select('ten').eq('id', petA.id), 'đọc lại')[0];
  expect(lai.ten).toBe('Bí mật của A ' + hau);
  expect(ok(await A.c.from('lich_hen').select('trang_thai').eq('id', lichA), 'đọc lịch')[0].trang_thai).toBe('da_hoan_thanh');

  // người chưa đăng nhập không đọc được bảng nào
  const khach = createClient(CFG.url, CFG.anon, { auth: { persistSession: false } });
  for (const b of BANG) {
    const r = await khach.from(b).select('*').limit(5);
    expect(r.error || (r.data || []).length === 0, 'khách vãng lai đọc ' + b).toBeTruthy();
  }
});

test('khách B mở thẳng địa chỉ trang liên quan tới lịch của khách A: không thấy gì', async ({ browser }) => {
  test.setTimeout(180_000);
  await chuanBiDuLieuDatLich();
  const hau = Date.now().toString().slice(-6);
  const A = await taoKhach('C', '093' + hau + '3');
  const chuA = ok(await A.c.from('chu_nuoi').select('id').limit(1), 'chủ nuôi')[0];
  const bs = await dn(TK.bac_si), lt = (await dn(TK.le_tan)).c;
  const ten = 'RiengTu' + hau;
  const petA = ok(await A.c.from('thu_cung').insert({ chu_nuoi_id: chuA.id, ten, loai: 'Chó' }).select('id'), 'thú cưng')[0];
  const dv = ok(await A.c.from('dich_vu').select('id').eq('ten', DV.ten), 'dịch vụ')[0];
  const gio = await goiCoCho(() => A.c.rpc('khung_gio_trong', { p_bac_si: bs.id, p_ngay: ngayVN(20) }), 'giờ trống');
  const lichA = await goiCoCho(() => A.c.rpc('dat_lich', { p_thu_cung: petA.id, p_bac_si: bs.id, p_dich_vu: dv.id, p_thoi_gian: gio[gio.length - 1].thoi_gian, p_vaccine: null, p_ghi_chu: null }), 'đặt lịch');
  ok(await lt.rpc('xac_nhan_lich', { p_lich: lichA }), 'xác nhận');

  const c = await ngCanhMoi(browser), p = await c.newPage();
  try {
    await dangNhap(p, TK.chu_nuoi, KHU.chu_nuoi);                          // một khách khác (tài khoản dùng chung của bộ test)
    await p.goto('/chu-nuoi/dat-lich.html?doi=' + lichA);                  // đổi giờ lịch của người khác
    await expect(p.locator('#vung')).toContainText('Không tìm thấy lịch cần đổi');
    await expect(p.locator('body')).not.toContainText(ten);
    await p.goto('/bac-si/kham.html?lich=' + lichA);                       // trang khám của bác sĩ
    await p.waitForURL(u => !u.pathname.includes('/bac-si/'), { timeout: 15_000 });
    await p.goto('/chu-nuoi/hoa-don.html');
    await expect(p.locator('#vung')).not.toContainText(ten);
    await p.goto('/chu-nuoi/');
    await expect(p.locator('body')).not.toContainText(ten);
    await p.goto('/chu-nuoi/dat-lich.html');
    await expect(p.locator('label.chon', { hasText: ten })).toHaveCount(0);
  } finally { await c.close(); }
});
