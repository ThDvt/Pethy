import { test, expect, TK, KHU, dangNhap, ngCanhMoi } from '../helpers.js';
import { chuanBiDuLieuDatLich, dn, DV } from '../seed.js';
import { ngayVN } from '../luong.js';
import { ok, thanhCong, taoLichDaXacNhan, khamXong } from '../api.js';

// Những tình huống có người thật mới gặp: hai người cùng làm một việc cùng lúc, bấm đúp, mất mạng giữa chừng.
// Lỗi ở đây thường làm sai tiền, sai kho hoặc trùng lịch, nên kiểm tra kỹ.

test('hai khách cùng đặt một khung giờ: chỉ một người được', async () => {
  await chuanBiDuLieuDatLich();
  const bs = await dn(TK.bac_si), cn = await dn(TK.chu_nuoi);
  const chu = ok(await cn.c.from('chu_nuoi').select('id').limit(1), 'đọc hồ sơ chủ nuôi')[0];
  const pets = ok(await cn.c.from('thu_cung').insert([{ chu_nuoi_id: chu.id, ten: 'DT-A' + Date.now(), loai: 'Chó' }, { chu_nuoi_id: chu.id, ten: 'DT-B' + Date.now(), loai: 'Mèo' }]).select('id'), 'thêm thú cưng');
  const dv = ok(await cn.c.from('dich_vu').select('id').eq('ten', DV.ten), 'đọc dịch vụ')[0];
  const gio = ok(await cn.c.rpc('khung_gio_trong', { p_bac_si: bs.id, p_ngay: ngayVN(9) }), 'giờ trống');
  const t = gio[gio.length - 1].thoi_gian;
  const kq = await Promise.all(pets.map(p => cn.c.rpc('dat_lich', { p_thu_cung: p.id, p_bac_si: bs.id, p_dich_vu: dv.id, p_thoi_gian: t, p_vaccine: null, p_ghi_chu: null })));
  expect(thanhCong(kq), 'đúng một lịch được tạo cho một khung giờ').toBe(1);
  const dem = ok(await cn.c.from('lich_hen').select('id').eq('bac_si_id', bs.id).eq('thoi_gian', t).neq('trang_thai', 'da_huy'), 'đếm lịch');
  expect(dem).toHaveLength(1);
});

test('hai lễ tân cùng xác nhận một lịch: chỉ một lần có hiệu lực', async () => {
  await chuanBiDuLieuDatLich();
  const s = await taoLichDaXacNhan({ ngay: ngayVN(10), tenThuCung: 'XN' + Date.now(), xacNhan: false });
  const lt2 = (await dn(TK.le_tan)).c;
  const kq = await Promise.all([s.lt.rpc('xac_nhan_lich', { p_lich: s.lichId }), lt2.rpc('xac_nhan_lich', { p_lich: s.lichId })]);
  expect(thanhCong(kq)).toBe(1);
  const l = ok(await s.lt.from('lich_hen').select('trang_thai').eq('id', s.lichId), 'đọc lịch')[0];
  expect(l.trang_thai).toBe('da_xac_nhan');
});

test('hai thu ngân cùng thu một hóa đơn: không thu quá số tiền, không thu hai lần', async () => {
  await chuanBiDuLieuDatLich();
  const s = await taoLichDaXacNhan({ ngay: ngayVN(11), tenThuCung: 'TT' + Date.now() });
  await khamXong(s);
  const tn1 = (await dn(TK.thu_ngan)).c, tn2 = (await dn(TK.thu_ngan)).c;
  const hd = ok(await tn1.rpc('lap_hoa_don', { p_lich: s.lichId }), 'lập hóa đơn');
  // hai lần lập hóa đơn cùng lúc cho một lịch chỉ ra một hóa đơn
  const lap2 = await Promise.all([tn1.rpc('lap_hoa_don', { p_lich: s.lichId }), tn2.rpc('lap_hoa_don', { p_lich: s.lichId })]);
  expect(thanhCong(lap2), 'lịch đã có hóa đơn thì không lập thêm').toBe(0);
  const kq = await Promise.all([tn1.rpc('ghi_thanh_toan', { p_hoa_don: hd, p_so_tien: DV.gia, p_phuong_thuc: 'tien_mat' }), tn2.rpc('ghi_thanh_toan', { p_hoa_don: hd, p_so_tien: DV.gia, p_phuong_thuc: 'chuyen_khoan' })]);
  expect(thanhCong(kq), 'chỉ một lần thu đủ được ghi').toBe(1);
  const tt = ok(await tn1.from('thanh_toan').select('so_tien').eq('hoa_don_id', hd), 'đọc thanh toán');
  expect(tt.reduce((a, x) => a + x.so_tien, 0)).toBe(DV.gia);

  // hai lần thu một phần (mỗi lần 100.000 trên hóa đơn 150.000): chỉ một lần được, tổng không vượt
  const s2 = await taoLichDaXacNhan({ ngay: ngayVN(11), tenThuCung: 'TT2' + Date.now() });
  await khamXong(s2);
  const hd2 = ok(await tn1.rpc('lap_hoa_don', { p_lich: s2.lichId }), 'lập hóa đơn 2');
  const kq2 = await Promise.all([tn1.rpc('ghi_thanh_toan', { p_hoa_don: hd2, p_so_tien: 100000, p_phuong_thuc: 'tien_mat' }), tn2.rpc('ghi_thanh_toan', { p_hoa_don: hd2, p_so_tien: 100000, p_phuong_thuc: 'tien_mat' })]);
  expect(thanhCong(kq2)).toBe(1);
  const tt2 = ok(await tn1.from('thanh_toan').select('so_tien').eq('hoa_don_id', hd2), 'đọc thanh toán 2');
  expect(tt2.reduce((a, x) => a + x.so_tien, 0)).toBe(100000);
});

test('hai bác sĩ kê đơn cùng lúc vượt tồn kho: kho không bao giờ âm', async () => {
  test.setTimeout(90_000);
  await chuanBiDuLieuDatLich();
  const ad = (await dn(TK.admin)).c, kho = (await dn(TK.kho)).c;
  const ten = 'Thuốc hiếm ' + Date.now().toString().slice(-6);
  const t = ok(await ad.from('thuoc').insert({ ten, loai: 'thuoc', don_vi: 'viên', gia_ban: 1000, nguong_canh_bao: 1 }).select('id'), 'thêm thuốc')[0];
  ok(await kho.rpc('nhap_kho', { p_thuoc: t.id, p_so_lo: 'HIEM-1', p_han_dung: '2035-12-31', p_so_luong: 5 }), 'nhập 5 viên');
  const a = await taoLichDaXacNhan({ ngay: ngayVN(12), tenThuCung: 'KD1' + Date.now() });
  const b = await taoLichDaXacNhan({ ngay: ngayVN(12), tenThuCung: 'KD2' + Date.now() });
  const hsA = await khamXong(a), hsB = await khamXong(b);
  const bs2 = (await dn(TK.bac_si)).c;
  const kq = await Promise.all([
    a.bs.c.rpc('ke_don', { p_ho_so: hsA, p_dong: [{ thuoc_id: t.id, so_luong: 4, lieu_dung: 'Ngày 2 lần' }] }),
    bs2.rpc('ke_don', { p_ho_so: hsB, p_dong: [{ thuoc_id: t.id, so_luong: 4, lieu_dung: 'Ngày 2 lần' }] })
  ]);
  expect(thanhCong(kq), 'chỉ một đơn 4 viên được trừ kho khi chỉ có 5 viên').toBe(1);
  const ton = ok(await kho.from('ton_kho_thuoc').select('ton_con_han').eq('thuoc_id', t.id), 'đọc tồn')[0];
  expect(ton.ton_con_han).toBe(1);
});

test('bấm đúp nút Đặt lịch chỉ tạo một lịch; mất mạng thì báo lỗi, có mạng lại bấm lại được và vẫn chỉ một lịch', async ({ browser }) => {
  test.setTimeout(150_000);
  await chuanBiDuLieuDatLich();
  const ten = 'Dup' + Date.now().toString().slice(-6);
  const cn = await dn(TK.chu_nuoi), bs = await dn(TK.bac_si);
  const chu = ok(await cn.c.from('chu_nuoi').select('id').limit(1), 'chủ nuôi')[0];
  ok(await cn.c.from('thu_cung').insert({ chu_nuoi_id: chu.id, ten, loai: 'Chó' }), 'thêm thú cưng');
  const c = await ngCanhMoi(browser), p = await c.newPage();
  try {
    await dangNhap(p, TK.chu_nuoi, KHU.chu_nuoi);
    await p.goto('/chu-nuoi/dat-lich.html');
    // đi tới bước xác nhận
    await p.locator('label.chon', { hasText: ten }).click();
    await p.locator('label.chon', { hasText: DV.ten }).click();
    await p.locator('label.chon', { hasText: TK.bac_si.ten }).click();
    await p.getByRole('button', { name: 'Tiếp tục: chọn giờ' }).click();
    await p.locator('#ngay').fill(ngayVN(13));
    await expect(p.locator('#gio-box .tg button').first()).toBeVisible();
    await p.locator('#gio-box .tg button').last().click();
    await p.getByRole('button', { name: 'Tiếp tục: xác nhận' }).click();
    const nutDat = p.getByRole('button', { name: /^Đặt lịch$/ });
    await expect(nutDat).toBeVisible();

    // mất mạng: bấm đặt thì báo lỗi, nút dùng lại được
    await c.setOffline(true);
    await nutDat.click();
    await expect(p.locator('#loi')).toBeVisible({ timeout: 20_000 });
    await expect(nutDat).toBeEnabled();
    const truoc = ok(await cn.c.from('lich_hen').select('id,thu_cung!inner(ten)').eq('thu_cung.ten', ten), 'đếm lịch khi mất mạng');
    expect(truoc, 'mất mạng thì chưa có lịch nào').toHaveLength(0);

    // có mạng lại: bấm đúp liên tiếp
    await c.setOffline(false);
    await nutDat.dblclick();
    await expect(p.locator('#tieu-de')).toHaveText('Đã gửi yêu cầu đặt lịch', { timeout: 20_000 });
    const sau = ok(await cn.c.from('lich_hen').select('id,thu_cung!inner(ten)').eq('thu_cung.ten', ten).neq('trang_thai', 'da_huy'), 'đếm lịch');
    expect(sau, 'bấm đúp chỉ tạo một lịch').toHaveLength(1);
    expect(bs).toBeTruthy();
  } finally { await c.close(); }
});

test('bấm đúp "Ghi nhận thu tiền" chỉ ghi một lần thu', async ({ browser }) => {
  test.setTimeout(120_000);
  await chuanBiDuLieuDatLich();
  const s = await taoLichDaXacNhan({ ngay: ngayVN(14), tenThuCung: 'DT2' + Date.now().toString().slice(-6) });
  await khamXong(s);
  const ten = (await s.cn.c.from('thu_cung').select('ten').eq('id', s.petId))?.data?.[0]?.ten;
  const c = await ngCanhMoi(browser), p = await c.newPage();
  try {
    await dangNhap(p, TK.thu_ngan, KHU.thu_ngan);
    const cho = p.locator('#ds-lap .hang', { hasText: ten });
    await expect(cho).toHaveCount(1);
    await cho.getByRole('button', { name: 'Lập hóa đơn' }).dblclick();
    const hop = p.locator('#hop');
    await expect(hop).toBeVisible();
    await hop.locator('#st').fill('50000');
    await hop.getByRole('button', { name: 'Ghi nhận thu tiền' }).dblclick();
    await expect(hop).toBeHidden({ timeout: 15_000 });
    const tn = (await dn(TK.thu_ngan)).c;
    const hd = ok(await tn.from('hoa_don').select('id,thanh_toan(so_tien),lich_hen_id').eq('lich_hen_id', s.lichId).neq('trang_thai', 'da_huy'), 'đọc hóa đơn');
    expect(hd, 'chỉ một hóa đơn dù bấm đúp').toHaveLength(1);
    expect(hd[0].thanh_toan.reduce((a, x) => a + x.so_tien, 0), 'bấm đúp chỉ thu một lần 50.000').toBe(50000);
  } finally { await c.close(); }
});
