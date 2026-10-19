(async function(){
  const { db, el, tien, gio } = Pethy, A = Pethy.admin, { khoiDong } = Pethy.khu, $ = A.$;
  if (!await khoiDong('chu_nuoi', 'Chủ nuôi', Pethy.chuNuoi.MUC, '/chu-nuoi/hoa-don.html')) return;
  const TT = {chua_thanh_toan:'Chưa thanh toán',thanh_toan_mot_phan:'Đã trả một phần',da_thanh_toan:'Đã thanh toán'};
  const PT = {tien_mat:'Tiền mặt',chuyen_khoan:'Chuyển khoản'};
  const r = await db.from('hoa_don').select('id,tong_tien,trang_thai,created_at,thanh_toan(so_tien,phuong_thuc,thoi_gian),ct_hoa_don(mo_ta,so_luong,thanh_tien),lich_hen(thu_cung(ten))').neq('trang_thai','da_huy').order('created_at',{ascending:false}).limit(50);
  if (r.error) return A.baoLoi('Không tải được hóa đơn. Vui lòng tải lại trang.');
  const ds = r.data || [];
  $('vung').replaceChildren(...(ds.length ? ds.map(h => {
    const da = (h.thanh_toan || []).reduce((s, t) => s + t.so_tien, 0);
    return el('details',{style:'border-top:1px solid var(--vach)'},
      el('summary',{class:'hang',style:'cursor:pointer;list-style:none;border-bottom:0'},
        el('div',{class:'ten'}, h.lich_hen?.thu_cung?.ten || 'Thú cưng', el('div',{class:'nho',style:'font-weight:400'}, A.ngay(h.created_at))),
        el('span',{class:'tt' + (h.trang_thai === 'da_thanh_toan' ? '' : ' do')}, TT[h.trang_thai]),
        el('div',{class:'gt'}, tien(h.tong_tien))),
      el('div',{style:'padding:0 0 16px'}, ...(h.ct_hoa_don || []).map(c => el('div',{class:'hang',style:'padding:6px 0;border-bottom:0;font-size:14px'}, el('div',{class:'ten',style:'font-weight:400'}, c.mo_ta + (c.so_luong > 1 ? ' x ' + c.so_luong : '')), el('div',{class:'gt',style:'font-size:14px'}, tien(c.thanh_tien)))),
        ...(h.thanh_toan || []).map(t => el('div',{class:'hang nho',style:'padding:4px 0;border-bottom:0'}, el('div',{class:'ten',style:'font-weight:400'}, 'Đã trả ' + A.ngay(t.thoi_gian) + ', ' + PT[t.phuong_thuc]), el('div',{class:'gt',style:'font-size:14px'}, tien(t.so_tien)))),
        h.trang_thai !== 'da_thanh_toan' ? el('div',{style:'font-weight:700;padding-top:8px'}, 'Còn lại ' + tien(h.tong_tien - da)) : null));
  }) : [A.rong('Bạn chưa có hóa đơn nào.')]));
  $('vung').firstChild && ($('vung').style.cssText = 'margin-top:20px;border-bottom:1px solid var(--vach)');
})();
