(async function(){
  const { db, el } = Pethy, A = Pethy.admin, $ = A.$;
  if (!await A.boot('/admin/nhat-ky.html')) return;
  const HD = {them:'Thêm',sua:'Sửa',xoa:'Xóa',xem:'Xem hồ sơ'};
  const SO = 100;
  const loc = el('select',{id:'loc',class:'nho','aria-label':'Lọc theo hành động'}, el('option',{value:''}, 'Mọi hành động'), Object.entries(HD).map(([k, v]) => el('option',{value:k}, v)));
  const hd = A.luongHoatDong(SO, loc);
  const ghiChu = el('div');
  async function dem(){
    let q = db.from('nhat_ky').select('id', { count: 'exact', head: true });
    if (loc.value) q = q.eq('hanh_dong', loc.value);
    const r = await q;
    ghiChu.replaceChildren(...(!r.error && r.count > SO ? [el('p',{class:'nho',id:'nk-con',style:'padding:12px 0'}, 'Đang hiển thị ' + SO + ' bản ghi gần nhất trong tổng số ' + r.count + '.')] : []));
  }
  loc.addEventListener('change', () => { hd.tai(); dem(); });
  $('vung').replaceChildren(el('div',{style:'margin-top:20px'}, loc), el('div',{class:'muc',style:'margin-top:12px'}, hd.ds, ghiChu));
  await Promise.all([hd.tai(), dem()]);
  Pethy.khiDoi(['nhat_ky'], dem);
})();
