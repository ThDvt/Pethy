import { TK } from './helpers.js';
import { dn, DV } from './seed.js';

export const ok = (r, viec) => { if (r.error) throw new Error(`${viec}: ${r.error.message}`); return r.data; };
export const thanhCong = kq => kq.filter(r => !r.error).length;

// Dựng nhanh bằng API (mỗi bước do đúng vai trò): thú cưng của chủ nuôi thử, lịch ở giờ trống CUỐI của ngày `ngay`, đã xác nhận.
// Dùng cho các thử nghiệm chạy song song, nơi giao diện quá chậm để tạo tình huống tranh chấp.
export async function taoLichDaXacNhan({ ngay, tenThuCung, xacNhan = true }){
  const cn = await dn(TK.chu_nuoi), lt = (await dn(TK.le_tan)).c, bs = await dn(TK.bac_si);
  const chu = ok(await cn.c.from('chu_nuoi').select('id').limit(1), 'đọc hồ sơ chủ nuôi')[0];
  const pet = ok(await cn.c.from('thu_cung').insert({ chu_nuoi_id: chu.id, ten: tenThuCung, loai: 'Chó' }).select('id'), 'thêm thú cưng')[0];
  const dv = ok(await cn.c.from('dich_vu').select('id').eq('ten', DV.ten), 'đọc dịch vụ')[0];
  const gio = ok(await cn.c.rpc('khung_gio_trong', { p_bac_si: bs.id, p_ngay: ngay }), 'khung giờ trống');
  if (!gio.length) throw new Error('Bác sĩ thử không còn giờ trống ngày ' + ngay);
  const thoiGian = gio[gio.length - 1].thoi_gian;
  const lich = ok(await cn.c.rpc('dat_lich', { p_thu_cung: pet.id, p_bac_si: bs.id, p_dich_vu: dv.id, p_thoi_gian: thoiGian, p_vaccine: null, p_ghi_chu: null }), 'đặt lịch');
  if (xacNhan) ok(await lt.rpc('xac_nhan_lich', { p_lich: lich }), 'xác nhận lịch');
  return { cn, lt, bs, petId: pet.id, lichId: lich, dvId: dv.id, thoiGian };
}
export const khamXong = async s => ok(await s.bs.c.rpc('ghi_ho_so_kham', { p_lich: s.lichId, p_chan_doan: 'Khám thử', p_can_nang: null, p_nhiet_do: null, p_ghi_chu: null }), 'ghi hồ sơ khám');
