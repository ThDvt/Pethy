import { test, expect, TK, KHU, dangNhap, ngCanhMoi } from '../helpers.js';
import { chuanBiDuLieuDatLich, dn, DV } from '../seed.js';
import { ngayVN } from '../luong.js';
import { ok, goiCoCho, taoLichDaXacNhan, khamXong } from '../api.js';

const so = chu => Number(String(chu).replace(/[^\d]/g, ''));
const DAI = n => 'Đ'.repeat(n);

test('tên có dấu, ký tự đặc biệt, trùng tên, HTML: hiển thị nguyên văn và không chạy mã', async ({ browser }) => {
  test.setTimeout(120_000);
  await chuanBiDuLieuDatLich();
  const hau = Date.now().toString().slice(-5);
  const ten1 = `Mướp Đỏ ƯƠ ắẳẵ ${hau} 🐶`, ten2 = `<img src=x onerror=window.__xss=1> ${hau}`, ten3 = `Mít ${hau}`;
  const c = await ngCanhMoi(browser), p = await c.newPage();
  let hopThoai = 0; p.on('dialog', d => { hopThoai++; d.dismiss(); });
  try {
    await dangNhap(p, TK.chu_nuoi, KHU.chu_nuoi);
    for (const ten of [ten1, ten2, ten3, ten3]) {                 // ten3 thêm hai lần: trùng tên vẫn cho phép
      await p.goto('/chu-nuoi/thu-cung.html');
      await p.locator('#ten').fill(ten); await p.locator('#loai').fill('Chó & mèo <i>lai</i>');
      await p.locator('#gui').click();
      await expect(p.locator('#ds')).toContainText(ten.slice(0, 12));
    }
    await expect(p.locator('#ds .dong', { hasText: ten3 })).toHaveCount(2);
    await expect(p.locator('#ds img')).toHaveCount(0);            // HTML trong tên không thành thẻ
    await expect(p.locator('#ds i')).toHaveCount(0);
    expect(await p.evaluate(() => window.__xss), 'mã trong tên không chạy').toBeUndefined();
    // tên hiện cả ở trang đặt lịch và các khu khác
    await p.goto('/chu-nuoi/dat-lich.html');
    await expect(p.locator('label.chon', { hasText: ten1 })).toHaveCount(1);
    await expect(p.locator('label.chon img')).toHaveCount(0);
    expect(hopThoai).toBe(0);
    // tên dài đúng giới hạn của ô nhập (60 ký tự) không làm vỡ bố cục
    await p.goto('/chu-nuoi/thu-cung.html');
    await p.locator('#ten').fill('W'.repeat(80)); await p.locator('#loai').fill('Chó');
    expect(await p.locator('#ten').inputValue(), 'ô nhập chặn ở 60 ký tự').toHaveLength(60);
    await p.locator('#gui').click();
    await expect(p.locator('#ds')).toContainText('W'.repeat(60));
    expect(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'tên dài không làm tràn ngang').toBeTruthy();
  } finally { await c.close(); }
});

test('giới hạn độ dài ở tầng cơ sở dữ liệu: dữ liệu quá dài bị từ chối dù gọi thẳng API', async () => {
  test.setTimeout(120_000);
  await chuanBiDuLieuDatLich();
  const cn = await dn(TK.chu_nuoi), lt = (await dn(TK.le_tan)).c, ad = (await dn(TK.admin)).c, kho = (await dn(TK.kho)).c, bs = await dn(TK.bac_si);
  const chu = ok(await cn.c.from('chu_nuoi').select('id').limit(1), 'chủ nuôi')[0];
  const quaDai = async (viec, lam) => { const r = await lam(); expect.soft(r.error, viec + ' phải bị từ chối khi quá dài').toBeTruthy(); };

  await quaDai('thu_cung.ten 5000 ký tự', () => cn.c.from('thu_cung').insert({ chu_nuoi_id: chu.id, ten: DAI(5000), loai: 'Chó' }));
  await quaDai('thu_cung.loai 5000 ký tự', () => cn.c.from('thu_cung').insert({ chu_nuoi_id: chu.id, ten: 'DL', loai: DAI(5000) }));
  await quaDai('chu_nuoi.ho_ten 5000 ký tự', () => lt.from('chu_nuoi').insert({ ho_ten: DAI(5000), so_dien_thoai: '09' + Date.now().toString().slice(-8) }));
  await quaDai('chu_nuoi.dia_chi 5000 ký tự', () => lt.from('chu_nuoi').insert({ ho_ten: 'DL', so_dien_thoai: '09' + (Date.now() + 1).toString().slice(-8), dia_chi: DAI(5000) }));
  await quaDai('dich_vu.ten 5000 ký tự', () => ad.from('dich_vu').insert({ ten: DAI(5000), loai: 'kham', gia: 1 }));
  await quaDai('thuoc.ten 5000 ký tự', () => ad.from('thuoc').insert({ ten: DAI(5000), loai: 'thuoc', don_vi: 'viên', gia_ban: 1 }));
  await quaDai('thuoc.don_vi 5000 ký tự', () => ad.from('thuoc').insert({ ten: 'DL-dv', loai: 'thuoc', don_vi: DAI(5000), gia_ban: 1 }));
  await quaDai('lịch hẹn: ghi chú 5000 ký tự', async () => {
    const pet = ok(await cn.c.from('thu_cung').insert({ chu_nuoi_id: chu.id, ten: 'DLG' + Date.now(), loai: 'Chó' }).select('id'), 'thú cưng')[0];
    const dv = ok(await cn.c.from('dich_vu').select('id').eq('ten', DV.ten), 'dịch vụ')[0];
    const gio = await goiCoCho(() => cn.c.rpc('khung_gio_trong', { p_bac_si: bs.id, p_ngay: ngayVN(15) }), 'giờ trống');
    return cn.c.rpc('dat_lich', { p_thu_cung: pet.id, p_bac_si: bs.id, p_dich_vu: dv.id, p_thoi_gian: gio[gio.length - 1].thoi_gian, p_vaccine: null, p_ghi_chu: DAI(5000) });
  });
  const s = await taoLichDaXacNhan({ ngay: ngayVN(16), tenThuCung: 'DLK' + Date.now() });
  await quaDai('hồ sơ khám: chẩn đoán 100000 ký tự', () => bs.c.rpc('ghi_ho_so_kham', { p_lich: s.lichId, p_chan_doan: DAI(100000), p_can_nang: null, p_nhiet_do: null, p_ghi_chu: null }));
  await quaDai('hồ sơ khám: ghi chú 100000 ký tự', () => bs.c.rpc('ghi_ho_so_kham', { p_lich: s.lichId, p_chan_doan: 'ok', p_can_nang: null, p_nhiet_do: null, p_ghi_chu: DAI(100000) }));
  await quaDai('hủy lịch: lý do 100000 ký tự', () => lt.rpc('huy_lich', { p_lich: s.lichId, p_ly_do: DAI(100000) }));
  const hs = ok(await bs.c.rpc('ghi_ho_so_kham', { p_lich: s.lichId, p_chan_doan: 'Khám thử', p_can_nang: null, p_nhiet_do: null, p_ghi_chu: null }), 'hồ sơ khám hợp lệ');
  const t = ok(await ad.from('thuoc').select('id').eq('ten', 'Thuốc E2E'), 'thuốc')[0];
  await quaDai('đơn thuốc: liều dùng 5000 ký tự', () => bs.c.rpc('ke_don', { p_ho_so: hs, p_dong: [{ thuoc_id: t.id, so_luong: 1, lieu_dung: DAI(5000) }] }));
  const lo = ok(await kho.from('lo_thuoc').select('id').eq('thuoc_id', t.id), 'lô')[0];
  await quaDai('kiểm kê: lý do 100000 ký tự', () => kho.rpc('dieu_chinh_kho', { p_lo: lo.id, p_so_luong_moi: 100, p_ly_do: DAI(100000) }));
  await quaDai('nhập kho: số lô 5000 ký tự', () => kho.rpc('nhap_kho', { p_thuoc: t.id, p_so_lo: DAI(5000), p_han_dung: '2035-12-31', p_so_luong: 1 }));
});

test('số tiền và số lượng ở biên: âm, 0, quá lớn, số thập phân bị từ chối', async () => {
  await chuanBiDuLieuDatLich();
  const ad = (await dn(TK.admin)).c, kho = (await dn(TK.kho)).c, tn = (await dn(TK.thu_ngan)).c;
  const t = ok(await ad.from('thuoc').select('id').eq('ten', 'Thuốc E2E'), 'thuốc')[0];
  expect.soft((await ad.from('dich_vu').insert({ ten: 'Giá âm ' + Date.now(), loai: 'kham', gia: -1 })).error, 'giá dịch vụ âm').toBeTruthy();
  expect.soft((await ad.from('dich_vu').insert({ ten: 'Giá lớn ' + Date.now(), loai: 'kham', gia: 99999999999 })).error, 'giá dịch vụ vượt kiểu số nguyên').toBeTruthy();
  expect.soft((await ad.from('thuoc').insert({ ten: 'Giá âm ' + Date.now(), loai: 'thuoc', don_vi: 'viên', gia_ban: -5 })).error, 'giá thuốc âm').toBeTruthy();
  for (const n of [0, -3, 1.5, 2_000_000_000_000]) expect.soft((await kho.rpc('nhap_kho', { p_thuoc: t.id, p_so_lo: 'BIEN-' + Date.now(), p_han_dung: '2035-12-31', p_so_luong: n })).error, 'nhập kho số lượng ' + n).toBeTruthy();
  for (const n of [0, -100, 1.5]) expect.soft((await tn.rpc('ghi_thanh_toan', { p_hoa_don: '00000000-0000-0000-0000-000000000000', p_so_tien: n, p_phuong_thuc: 'tien_mat' })).error, 'thu tiền ' + n).toBeTruthy();
});

test('doanh thu: số trên trang admin khớp đúng số tiền đã thu, chia đúng tiền mặt và chuyển khoản', async ({ browser }) => {
  test.setTimeout(180_000);
  await chuanBiDuLieuDatLich();
  const c = await ngCanhMoi(browser), p = await c.newPage();
  const doc = async () => {
    await p.goto('/admin/doanh-thu.html');
    await p.getByRole('button', { name: 'Xem' }).click();
    const the = p.locator('.the > div .v');
    await expect(the).toHaveCount(3);
    const g = (await the.allTextContents()).map(so);
    const dv = await p.locator('.hang', { hasText: DV.ten }).first().locator('.gt').textContent().catch(() => '0');
    return { tong: g[0], tienMat: g[1], ck: g[2], banDv: so(dv) };
  };
  try {
    await dangNhap(p, TK.admin, KHU.admin);
    const truoc = await doc();
    expect(truoc.tong, 'tổng = tiền mặt + chuyển khoản').toBe(truoc.tienMat + truoc.ck);
    const s = await taoLichDaXacNhan({ ngay: ngayVN(17), tenThuCung: 'DTh' + Date.now() });
    await khamXong(s);
    const tn = (await dn(TK.thu_ngan)).c;
    const hd = ok(await tn.rpc('lap_hoa_don', { p_lich: s.lichId }), 'lập hóa đơn');
    ok(await tn.rpc('ghi_thanh_toan', { p_hoa_don: hd, p_so_tien: 100000, p_phuong_thuc: 'tien_mat' }), 'thu 100.000 tiền mặt');
    ok(await tn.rpc('ghi_thanh_toan', { p_hoa_don: hd, p_so_tien: 50000, p_phuong_thuc: 'chuyen_khoan' }), 'thu 50.000 chuyển khoản');
    const sau = await doc();
    expect(sau.tong - truoc.tong, 'tổng tăng đúng 150.000').toBe(150000);
    expect(sau.tienMat - truoc.tienMat, 'tiền mặt tăng đúng 100.000').toBe(100000);
    expect(sau.ck - truoc.ck, 'chuyển khoản tăng đúng 50.000').toBe(50000);
    expect(sau.banDv - truoc.banDv, 'doanh số dịch vụ tăng đúng giá dịch vụ').toBe(DV.gia);
    expect(sau.tong).toBe(sau.tienMat + sau.ck);
    // hóa đơn bị hủy không tính vào doanh số
    const s2 = await taoLichDaXacNhan({ ngay: ngayVN(17), tenThuCung: 'DTh2' + Date.now() });
    await khamXong(s2);
    const hd2 = ok(await tn.rpc('lap_hoa_don', { p_lich: s2.lichId }), 'lập hóa đơn 2');
    ok(await tn.rpc('huy_hoa_don', { p_hoa_don: hd2 }), 'hủy hóa đơn');
    const cuoi = await doc();
    expect(cuoi.banDv, 'hóa đơn đã hủy không vào doanh số').toBe(sau.banDv);
    expect(cuoi.tong).toBe(sau.tong);
    // khoảng ngày sai bị từ chối
    await p.locator('#tu').fill(ngayVN(0)); await p.locator('#den').fill(ngayVN(-3));
    await p.getByRole('button', { name: 'Xem' }).click();
    await expect(p.locator('#loi-chung')).toContainText('Khoảng ngày không hợp lệ');
  } finally { await c.close(); }
});
