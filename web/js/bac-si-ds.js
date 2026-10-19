(async function(){
  const { db, el, gio } = Pethy, { khoiDong } = Pethy.khu, { MUC, TT, homNay, uid } = Pethy.bacSi;
  if (!await khoiDong('bac_si', 'Bác sĩ', MUC, '/bac-si/')) return;
  const me = await uid();
  const dau = new Date(homNay() + 'T00:00:00+07:00'), cuoi = new Date(dau.getTime() + 8 * 864e5);
  const r = await db.from('lich_hen')
    .select('id,thoi_gian,trang_thai,thu_cung(ten,loai),dich_vu(ten,loai)')
    .eq('bac_si_id', me).in('trang_thai',['da_xac_nhan','da_hoan_thanh','cho_xac_nhan'])
    .gte('thoi_gian', dau.toISOString()).lt('thoi_gian', cuoi.toISOString()).order('thoi_gian',{ascending:true});
  const o = document.getElementById('ds');
  if (r.error) { o.replaceChildren(el('p',{class:'loi'},'Không tải được lịch khám.')); return; }
  if (!r.data.length) { o.replaceChildren(el('p',{class:'ghi-chu'},'Bạn chưa có lịch nào trong 7 ngày tới.')); return; }
  const nhom = new Map();
  for (const l of r.data) {
    const k = new Date(l.thoi_gian).toLocaleDateString('vi-VN',{weekday:'long',day:'2-digit',month:'2-digit',timeZone:'Asia/Ho_Chi_Minh'});
    if (!nhom.has(k)) nhom.set(k, []); nhom.get(k).push(l);
  }
  o.replaceChildren(...[...nhom].flatMap(([k, ds], i) => [
    el('div',{class:'ngay-tieu',style:'padding-bottom:10px;border-bottom:2px solid var(--muc);margin-top:' + (i ? '32px' : '0')}, k),
    ...ds.map(l => {
      const duoc = l.trang_thai === 'da_xac_nhan' || l.trang_thai === 'da_hoan_thanh';
      return el('div',{class:'hang'},
        el('div',{class:'gio'}, gio(l.thoi_gian)),
        el('div',{style:'flex:2 1 220px'}, el('b',{}, l.thu_cung?.ten), ', ' + (l.thu_cung?.loai || '').toLowerCase()),
        el('div',{style:'flex:2 1 160px'}, l.dich_vu?.ten, el('div',{class:'nho'}, TT[l.trang_thai])),
        duoc ? el('a',{class:'nut' + (l.trang_thai === 'da_xac_nhan' ? ' chinh' : ''),href:'/bac-si/kham.html?lich=' + encodeURIComponent(l.id)}, l.trang_thai === 'da_hoan_thanh' ? 'Xem hồ sơ' : 'Khám')
              : el('span',{class:'nho'},'Chờ lễ tân xác nhận'));
    })]));
})();
