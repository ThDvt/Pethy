import { createClient } from '@supabase/supabase-js';
import { CFG, TK, kiemTraKhongPhaiHeThongThat } from './helpers.js';

// Dữ liệu nền cho luồng đặt lịch → thanh toán, chỉ dùng trên Supabase THỬ. Chạy lại nhiều lần vẫn an toàn (có thì bỏ qua).
export const DV = { ten: 'Khám tổng quát E2E', loai: 'kham', gia: 150000 };
export const DV_TIEM = { ten: 'Tiêm phòng E2E', loai: 'tiem', gia: 50000 };
export const VACCINE = { ten: 'Vaccine E2E', loai: 'vaccine', don_vi: 'liều', gia_ban: 100000, nguong_canh_bao: 3 };
export const THUOC = { ten: 'Thuốc E2E', loai: 'thuoc', don_vi: 'viên', gia_ban: 20000, nguong_canh_bao: 5 };

export async function dn(tk){
  const c = createClient(CFG.url, CFG.anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const r = await c.auth.signInWithPassword({ email: tk.email, password: tk.matKhau });
  if (r.error) throw new Error(`Không đăng nhập được ${tk.email}: ${r.error.message}`);
  return { c, id: r.data.user.id };
}
const ok = (r, viec) => { if (r.error) throw new Error(`${viec}: ${r.error.message}`); return r.data; };

export async function chuanBiDuLieuDatLich(){
  kiemTraKhongPhaiHeThongThat();
  const ad = (await dn(TK.admin)).c, bs = await dn(TK.bac_si), kho = (await dn(TK.kho)).c;

  if (!ok(await ad.from('dich_vu').select('id').eq('ten', DV.ten), 'đọc dịch vụ').length) ok(await ad.from('dich_vu').insert(DV), 'thêm dịch vụ');
  let t = ok(await ad.from('thuoc').select('id').eq('ten', THUOC.ten).eq('don_vi', THUOC.don_vi), 'đọc thuốc')[0];
  if (!t) t = ok(await ad.from('thuoc').insert(THUOC).select('id'), 'thêm thuốc')[0];
  if (!ok(await ad.from('ho_so_bac_si').select('id').eq('tai_khoan_id', bs.id), 'đọc hồ sơ bác sĩ').length)
    ok(await ad.from('ho_so_bac_si').insert({ tai_khoan_id: bs.id, chuyen_mon: 'Nội khoa chó mèo' }), 'thêm hồ sơ bác sĩ');
  // làm việc cả tuần 08:00 đến 17:00 để ngày nào chọn cũng có giờ trống
  const co = ok(await ad.from('lich_lam_viec').select('thu_trong_tuan').eq('bac_si_id', bs.id), 'đọc lịch làm việc').map(x => x.thu_trong_tuan);
  const thieu = [1, 2, 3, 4, 5, 6, 7].filter(d => !co.includes(d)).map(d => ({ bac_si_id: bs.id, thu_trong_tuan: d, gio_bat_dau: '08:00', gio_ket_thuc: '17:00' }));
  if (thieu.length) ok(await ad.from('lich_lam_viec').insert(thieu), 'thêm lịch làm việc');
  const ton = ok(await kho.from('ton_kho_thuoc').select('ton_con_han').eq('thuoc_id', t.id), 'đọc tồn kho')[0];
  if (!ton || ton.ton_con_han < 50) ok(await kho.rpc('nhap_kho', { p_thuoc: t.id, p_so_lo: 'E2E-LO1', p_han_dung: '2035-12-31', p_so_luong: 100 }), 'nhập kho');
  return { thuocId: t.id };
}

export async function tonKho(thuocId){
  const kho = (await dn(TK.kho)).c;
  const r = ok(await kho.from('ton_kho_thuoc').select('ton_con_han').eq('thuoc_id', thuocId), 'đọc tồn kho');
  return r[0] ? r[0].ton_con_han : 0;
}

// Thêm dịch vụ tiêm và vaccine có tồn kho (gọi sau chuanBiDuLieuDatLich).
export async function chuanBiDuLieuTiem(){
  await chuanBiDuLieuDatLich();
  const ad = (await dn(TK.admin)).c, kho = (await dn(TK.kho)).c;
  if (!ok(await ad.from('dich_vu').select('id').eq('ten', DV_TIEM.ten), 'đọc dịch vụ tiêm').length) ok(await ad.from('dich_vu').insert(DV_TIEM), 'thêm dịch vụ tiêm');
  let v = ok(await ad.from('thuoc').select('id').eq('ten', VACCINE.ten).eq('don_vi', VACCINE.don_vi), 'đọc vaccine')[0];
  if (!v) v = ok(await ad.from('thuoc').insert(VACCINE).select('id'), 'thêm vaccine')[0];
  const ton = ok(await kho.from('ton_kho_thuoc').select('ton_con_han').eq('thuoc_id', v.id), 'đọc tồn vaccine')[0];
  if (!ton || ton.ton_con_han < 10) ok(await kho.rpc('nhap_kho', { p_thuoc: v.id, p_so_lo: 'E2E-VC1', p_han_dung: '2035-12-31', p_so_luong: 30 }), 'nhập vaccine');
  return { vaccineId: v.id };
}
