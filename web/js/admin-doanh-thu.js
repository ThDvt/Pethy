(async function(){
  const { db, el, tien } = Pethy, A = Pethy.admin, { loiRpc } = Pethy.khu, $ = A.$;
  if (!await A.boot('/admin/doanh-thu.html')) return;
  const hn = A.homNay();
  const tu = el('input',{id:'tu',type:'date',value:hn.slice(0,4) + '-01-01',max:hn}), den = el('input',{id:'den',type:'date',value:hn,max:hn});
  const ra = el('div',{id:'ket-qua'});
  const NHOM = {'Dịch vụ':'Dịch vụ','Thuốc':'Thuốc','Vaccine':'Vaccine'};
  async function xem(){
    A.baoLoi('');
    if (!tu.value || !den.value || tu.value > den.value) return A.baoLoi('Khoảng ngày không hợp lệ.');
    const [t, d] = await Promise.all([db.rpc('doanh_thu_theo_thang', { p_tu: tu.value, p_den: den.value }), db.rpc('doanh_thu_theo_dich_vu', { p_tu: tu.value, p_den: den.value })]);
    if (t.error || d.error) return A.baoLoi(loiRpc(t.error || d.error));
    const th = t.data || [], dv = d.data || [], max = Math.max(1, ...th.map(x => Number(x.tong_thu)));
    const tong = th.reduce((s, x) => s + Number(x.tong_thu), 0), tm = th.reduce((s, x) => s + Number(x.tien_mat), 0);
    const nhom = {}; dv.forEach(x => (nhom[x.nhom] = nhom[x.nhom] || []).push(x));
    ra.replaceChildren(
      el('div',{class:'the'}, A.the('Tổng đã thu', tien(tong)), A.the('Tiền mặt', tien(tm)), A.the('Chuyển khoản', tien(tong - tm))),
      el('section',{class:'muc'}, el('h2',{}, 'Đã thu theo tháng'),
        ...(th.length ? th.map(x => el('div',{class:'hang'},
          el('div',{class:'ten',style:'flex:0 0 90px;font-family:var(--so);font-weight:500'}, x.thang.slice(5, 7) + '/' + x.thang.slice(0, 4)),
          el('div',{style:'flex:1 1 160px'}, el('div',{class:'thanh',style:'width:' + Math.round(Number(x.tong_thu) / max * 100) + '%'})),
          el('div',{class:'nho'}, x.so_giao_dich + ' lần thu'), el('div',{class:'gt'}, tien(x.tong_thu)))) : [A.rong('Chưa có khoản thu trong khoảng này.')])),
      el('section',{class:'muc'}, el('h2',{}, 'Doanh số theo mục (hóa đơn đã lập, chưa hủy)'),
        ...(dv.length ? Object.keys(nhom).map(k => el('div',{style:'margin-top:16px'}, el('div',{style:'font-weight:800;margin-bottom:2px'}, k),
          ...nhom[k].map(x => el('div',{class:'hang',style:'padding:8px 0'}, el('div',{class:'ten',style:'font-weight:400'}, x.ten), el('div',{class:'nho'}, 'SL ' + x.so_luong), el('div',{class:'gt'}, tien(x.tong_tien)))))) : [A.rong('Chưa có hóa đơn trong khoảng này.')])));
  }
  $('vung').replaceChildren(el('div',{style:'display:flex;flex-wrap:wrap;gap:12px 16px;align-items:flex-end;margin-top:20px'},
    el('div',{class:'truong',style:'margin:0'}, el('label',{for:'tu'}, 'Từ ngày'), tu), el('div',{class:'truong',style:'margin:0'}, el('label',{for:'den'}, 'Đến ngày'), den),
    el('button',{class:'nut chinh',type:'button',onclick:xem,style:'padding:12px 20px'}, 'Xem')), ra);
  await xem();
})();
