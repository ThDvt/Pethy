(async function(){
  const { db, el, gio } = Pethy, { khoiDong } = Pethy.khu, { MUC, TT, homNay, uid } = Pethy.bacSi;
  if (!await khoiDong('bac_si', 'Bác sĩ', MUC, '/bac-si/')) return;
  const me = await uid();
  async function tai(){
    const dau = new Date(homNay() + 'T00:00:00+07:00'), cuoi = new Date(dau.getTime() + 8 * 864e5);
    const r = await db.from('lich_hen')
      .select('id,thoi_gian,trang_thai,thu_cung(ten,loai),dich_vu(ten,loai)')
      .eq('bac_si_id', me).in('trang_thai',['da_xac_nhan','da_hoan_thanh','cho_xac_nhan'])
      .gte('thoi_gian', dau.toISOString()).lt('thoi_gian', cuoi.toISOString()).order('thoi_gian',{ascending:true});
    const o = document.getElementById('ds');
    if (r.error) { o.replaceChildren(el('p',{class:'loi'},'Không tải được lịch khám.')); return; }
    if (!r.data.length) { o.replaceChildren(el('p',{class:'ghi-chu'},'Bạn chưa có lịch nào trong 7 ngày tới.')); return; }
    const bay = Date.now(), tiep = r.data.find(l => l.trang_thai === 'da_xac_nhan' && new Date(l.thoi_gian).getTime() >= bay);   // ca đã xác nhận gần nhất chưa tới giờ
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
          el('div',{style:'flex:2 1 220px'}, el('b',{}, l.thu_cung?.ten), ', ' + (l.thu_cung?.loai || '').toLowerCase(), l === tiep ? el('span',{class:'tt xanh',style:'margin-left:8px'}, 'Ca tiếp theo') : null),
          el('div',{style:'flex:2 1 160px'}, l.dich_vu?.ten, el('div',{style:'margin-top:4px'}, Pethy.tt(l.trang_thai, TT[l.trang_thai]))),
          duoc ? el('a',{class:'nut' + (l.trang_thai === 'da_xac_nhan' ? ' chinh' : ''),href:'/bac-si/kham.html?lich=' + encodeURIComponent(l.id)}, l.trang_thai === 'da_hoan_thanh' ? 'Xem hồ sơ' : 'Khám')
                : el('span',{class:'nho'},'Chờ lễ tân xác nhận'));
      })]));
  }
  await tai();
  Pethy.khiDoi(['lich_hen'], tai);
  // Mũi tiêm do chính bác sĩ này ghi, có hạn tiêm tiếp trong 14 ngày tới và chưa được tiêm mũi sau.
  async function taiNhacTiem(){
    const hn = homNay(), cong = (s, n) => new Date(new Date(s + 'T00:00:00Z').getTime() + n * 864e5).toISOString().slice(0, 10);
    const r = await db.from('mui_tiem').select('id,thu_cung_id,thuoc_id,ngay_tiem,ngay_tiem_tiep,thu_cung(ten,loai),thuoc(ten)')
      .eq('bac_si_id', me).gte('ngay_tiem_tiep', hn).lte('ngay_tiem_tiep', cong(hn, 14)).order('ngay_tiem_tiep',{ascending:true});
    const vung = document.getElementById('nhac-tiem');
    if (r.error || !r.data) { vung.hidden = true; return; }
    let ds = r.data;
    if (ds.length) {
      const sau = await db.from('mui_tiem').select('thu_cung_id,thuoc_id,ngay_tiem').in('thu_cung_id', [...new Set(ds.map(m => m.thu_cung_id))]);
      if (!sau.error && sau.data) ds = ds.filter(m => !sau.data.some(x => x.thu_cung_id === m.thu_cung_id && x.thuoc_id === m.thuoc_id && x.ngay_tiem > m.ngay_tiem));
    }
    vung.hidden = false;
    document.getElementById('ds-nhac-tiem').replaceChildren(...(ds.length ? ds.map(m => el('div',{class:'hang'},
      el('div',{class:'gio'}, m.ngay_tiem_tiep.slice(8) + '/' + m.ngay_tiem_tiep.slice(5, 7)),
      el('div',{style:'flex:2 1 220px'}, el('b',{}, m.thu_cung?.ten), ', ' + (m.thu_cung?.loai || '').toLowerCase()),
      el('div',{style:'flex:2 1 160px'}, m.thuoc?.ten))) : [el('p',{class:'ghi-chu'},'Không có mũi tiêm nào sắp đến hạn.')]));
  }
  await taiNhacTiem();
  Pethy.khiDoi(['mui_tiem'], taiNhacTiem);
})();
