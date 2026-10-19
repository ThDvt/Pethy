(async function(){
  const { db, el, tien } = Pethy, A = Pethy.admin, { loiRpc } = Pethy.khu, $ = A.$;
  if (!await A.boot('/admin/')) return;
  const hn = A.homNay(), dauThang = hn.slice(0, 8) + '01';
  const dau = new Date(hn + 'T00:00:00+07:00').toISOString(), cuoi = new Date(new Date(hn + 'T00:00:00+07:00').getTime() + 864e5).toISOString();
  const [ng, th, lich, cn, cb] = await Promise.all([
    db.rpc('doanh_thu_theo_ngay', { p_tu: hn, p_den: hn }), db.rpc('doanh_thu_theo_thang', { p_tu: dauThang, p_den: hn }),
    db.from('lich_hen').select('id,trang_thai').gte('thoi_gian', dau).lt('thoi_gian', cuoi),
    db.from('cong_no_hoa_don').select('hoa_don_id,created_at,ten_chu_nuoi,so_dien_thoai,tong_tien,da_thu,con_no').order('created_at'),
    db.from('canh_bao_kho').select('loai_canh_bao,ten,so_lo,han_dung,ton')]);
  if (ng.error || th.error || cn.error) return A.baoLoi('Không tải được số liệu. Vui lòng tải lại trang.');
  const ngay0 = (ng.data && ng.data[0]) || { tong_thu: 0, so_giao_dich: 0 }, thang0 = (th.data && th.data[0]) || { tong_thu: 0 };
  const ls = lich.data || [], tongNo = (cn.data || []).reduce((s, x) => s + x.con_no, 0);
  const CB = {sap_het:'Sắp hết hàng',sap_het_han:'Lô sắp hết hạn',het_han:'Lô hết hạn còn tồn'};
  $('vung').replaceChildren(
    el('div',{class:'the'}, A.the('Thu hôm nay', tien(ngay0.tong_thu)), A.the('Thu tháng này', tien(thang0.tong_thu)),
      A.the('Lịch hôm nay', String(ls.length)), A.the('Công nợ', tien(tongNo))),
    el('section',{class:'muc'}, el('h2',{}, 'Hóa đơn chưa thu đủ'),
      ...((cn.data || []).length ? cn.data.map(x => el('div',{class:'hang'},
        el('div',{class:'ten'}, x.ten_chu_nuoi, el('div',{class:'nho',style:'font-weight:400'}, x.so_dien_thoai + ', lập ' + A.ngay(x.created_at))),
        el('div',{class:'nho'}, 'Đã thu ' + tien(x.da_thu) + ' / ' + tien(x.tong_tien)),
        el('div',{class:'gt'}, tien(x.con_no)))) : [A.rong('Không có công nợ.')])),
    el('section',{class:'muc'}, el('h2',{}, 'Cảnh báo kho'),
      ...((cb.data || []).length ? cb.data.map(c => el('div',{class:'hang'},
        el('div',{class:'ten'}, c.ten), el('span',{class:'tt do'}, CB[c.loai_canh_bao]),
        el('div',{class:'nho'}, (c.so_lo ? 'Lô ' + c.so_lo + ', hạn ' + A.ngay(c.han_dung) + ', ' : '') + 'còn ' + c.ton))) : [A.rong('Kho không có cảnh báo.')])));
})();
