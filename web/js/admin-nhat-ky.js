(async function(){
  const { db, el } = Pethy, A = Pethy.admin, $ = A.$;
  if (!await A.boot('/admin/nhat-ky.html')) return;
  const HD = {them:'Thêm',sua:'Sửa',xoa:'Xóa',xem:'Xem hồ sơ'};
  const BANG = {tai_khoan:'Tài khoản',chu_nuoi:'Chủ nuôi',ho_so_bac_si:'Hồ sơ bác sĩ',lich_lam_viec:'Lịch làm việc',cau_hinh:'Tham số',thu_cung:'Thú cưng',dich_vu:'Dịch vụ',thuoc:'Thuốc',lo_thuoc:'Lô thuốc',lich_hen:'Lịch hẹn',ho_so_kham:'Hồ sơ khám',don_thuoc:'Đơn thuốc',mui_tiem:'Mũi tiêm',hoa_don:'Hóa đơn',thanh_toan:'Thanh toán'};
  const loc = el('select',{id:'loc',class:'nho','aria-label':'Lọc theo hành động'}, el('option',{value:''}, 'Mọi hành động'), Object.entries(HD).map(([k, v]) => el('option',{value:k}, v)));
  const ds = el('div',{style:'border-top:2px solid var(--muc);margin-top:12px'});
  async function tai(){
    let q = db.from('nhat_ky').select('id,hanh_dong,bang_tac_dong,ban_ghi_id,thoi_gian,tai_khoan(ho_ten)').order('thoi_gian',{ascending:false}).limit(100);
    if (loc.value) q = q.eq('hanh_dong', loc.value);
    const r = await q; if (r.error) return A.baoLoi('Không tải được nhật ký.');
    ds.replaceChildren(...((r.data || []).length ? r.data.map(n => el('div',{class:'hang'},
      el('div',{class:'nho so',style:'flex:0 0 150px'}, A.ngay(n.thoi_gian) + ' ' + new Date(n.thoi_gian).toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit',timeZone:'Asia/Ho_Chi_Minh'})),
      el('div',{class:'ten',style:'font-weight:500'}, n.tai_khoan?.ho_ten || 'Hệ thống / SQL'),
      el('span',{class:'tt'}, HD[n.hanh_dong] || n.hanh_dong), el('div',{style:'flex:1 1 140px'}, BANG[n.bang_tac_dong] || n.bang_tac_dong || ''))) : [A.rong('Chưa có bản ghi nào.')]));
  }
  loc.addEventListener('change', tai);
  $('vung').replaceChildren(el('div',{style:'margin-top:20px'}, loc), ds);
  await tai();
})();
