(async function(){
  const { db, el, gio } = Pethy, { loiRpc, khoiDong } = Pethy.khu;
  const $ = id => document.getElementById(id);
  const MUC = [{ten:'Lịch hôm nay',href:'/le-tan/'}];
  const vt = await khoiDong('le_tan', 'Lễ tân', MUC, '/le-tan/');
  if (!vt) return;

  const TT = {cho_xac_nhan:'Chờ xác nhận',da_xac_nhan:'Đã xác nhận',da_hoan_thanh:'Đã hoàn thành',da_huy:'Đã hủy',khong_den:'Không đến'};
  const homNay = new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Ho_Chi_Minh'});
  const dau = new Date(homNay + 'T00:00:00+07:00'), cuoi = new Date(dau.getTime() + 864e5);
  const sdt = s => s ? s.replace(/^(\d{4})(\d{3})(\d+)$/, '$1 $2 $3') : '';
  const baoLoi = m => { $('loi-chung').textContent = m; $('loi-chung').hidden = !m; };
  $('ngay').textContent = new Date().toLocaleDateString('vi-VN',{weekday:'long',day:'2-digit',month:'2-digit',year:'numeric',timeZone:'Asia/Ho_Chi_Minh'});

  const bs = await db.from('bac_si_cong_khai').select('id,ho_ten');
  const tenBs = Object.fromEntries((bs.data||[]).map(b => [b.id, b.ho_ten.split(' ').slice(-1)[0]]));
  const CHON = 'id,thoi_gian,trang_thai,bac_si_id,thu_cung(ten,chu_nuoi(ho_ten,so_dien_thoai)),dich_vu(ten)';

  function dongCho(l){
    const cn = l.thu_cung?.chu_nuoi || {};
    return el('div',{class:'hang'},
      el('div',{class:'gio'}, gio(l.thoi_gian)),
      el('div',{class:'ct'}, el('div',{}, el('span',{class:'ten'}, l.thu_cung?.ten), ', ' + (cn.ho_ten || '')), el('div',{class:'nho so'}, sdt(cn.so_dien_thoai)),
        el('div',{class:'nho'}, new Date(l.thoi_gian).toLocaleDateString('vi-VN',{weekday:'short',day:'2-digit',month:'2-digit',timeZone:'Asia/Ho_Chi_Minh'}))),
      el('div',{style:'flex:2 1 180px'}, l.dich_vu?.ten, el('div',{class:'nho'}, 'Bác sĩ ' + (tenBs[l.bac_si_id] || ''))),
      el('div',{style:'display:flex;gap:16px;align-items:center'},
        el('button',{class:'nut chinh',type:'button',onclick:async ev => {
          const nutBam = ev.currentTarget; nutBam.disabled = true; baoLoi('');
          const { error } = await db.rpc('xac_nhan_lich', { p_lich: l.id });
          if (error) { nutBam.disabled = false; baoLoi(loiRpc(error)); }
          await tai();
        }}, 'Xác nhận'),
        el('button',{class:'lien-ket',type:'button',onclick:() => moTuChoi(l)}, 'Từ chối')));
  }

  function dongBang(l, laBayGio){
    const qua = new Date(l.thoi_gian) < new Date();
    const cn = l.thu_cung?.chu_nuoi || {};
    const act = l.trang_thai === 'da_xac_nhan' && qua
      ? el('button',{class:'lien-ket',type:'button',style:'display:block;margin-top:4px;font-size:13px;text-align:left',onclick:async () => {
          baoLoi(''); const { error } = await db.rpc('danh_dau_khong_den', { p_lich: l.id });
          if (error) baoLoi(loiRpc(error)); await tai(); }}, 'Đánh dấu không đến') : null;
    return el('div',{class:'hang' + (l.trang_thai === 'da_hoan_thanh' || l.trang_thai === 'da_huy' ? ' qua' : '')},
      el('div',{class:'gio so',style:'font-size:14px'}, gio(l.thoi_gian)),
      el('div',{class:'c-ct'}, el('b',{}, l.thu_cung?.ten), ', ' + (cn.ho_ten || '')),
      el('div',{class:'c-dv'}, l.dich_vu?.ten),
      el('div',{class:'c-bs'}, tenBs[l.bac_si_id] ? 'Bs. ' + tenBs[l.bac_si_id] : ''),
      el('div',{class:'c-tt'}, TT[l.trang_thai], act));
  }

  async function tai(){
    const [cho, ngay, nhac] = await Promise.all([
      db.from('lich_hen').select(CHON).eq('trang_thai','cho_xac_nhan').gte('thoi_gian', new Date().toISOString()).order('thoi_gian',{ascending:true}).limit(50),
      db.from('lich_hen').select(CHON).gte('thoi_gian', dau.toISOString()).lt('thoi_gian', cuoi.toISOString()).neq('trang_thai','da_huy').order('thoi_gian',{ascending:true}),
      db.from('lich_can_nhac').select('loai_nhac,lich_hen_id,mui_tiem_id,thoi_diem,ten_thu_cung,ten_chu_nuoi,so_dien_thoai,ten_dich_vu').order('thoi_diem',{ascending:true})
    ]);
    // danh sách chờ xác nhận
    if (cho.error) $('ds-cho').replaceChildren(el('p',{class:'loi'},'Không tải được danh sách chờ xác nhận.'));
    else { $('h-cho').textContent = 'Cần xác nhận (' + cho.data.length + ')';
      $('ds-cho').replaceChildren(...(cho.data.length ? cho.data.map(dongCho) : [el('p',{class:'ghi-chu'},'Không có lịch nào chờ xác nhận.')])); }
    // bảng hôm nay, chèn dòng "Bây giờ"
    if (ngay.error) $('bang').replaceChildren(el('p',{class:'loi'},'Không tải được lịch hôm nay.'));
    else {
      const tieu = el('div',{class:'hang tieu'}, el('div',{style:'flex:0 0 64px'},'GIỜ'), el('div',{class:'c-ct'},'THÚ CƯNG, CHỦ NUÔI'), el('div',{class:'c-dv'},'DỊCH VỤ'), el('div',{class:'c-bs'},'BÁC SĨ'), el('div',{class:'c-tt'},'TRẠNG THÁI'));
      const rows = []; let da = false; const bay = new Date();
      for (const l of ngay.data) {
        if (!da && new Date(l.thoi_gian) > bay) { rows.push(el('div',{class:'hang bay-gio'}, el('div',{class:'gio so',style:'font-size:14px'}, gio(bay.toISOString())), 'BÂY GIỜ')); da = true; }
        rows.push(dongBang(l));
      }
      if (!ngay.data.length) rows.push(el('p',{class:'ghi-chu',style:'margin-top:12px'},'Hôm nay chưa có lịch.'));
      $('bang').replaceChildren(tieu, ...rows);
      const nCho = ngay.data.filter(l => l.trang_thai === 'cho_xac_nhan').length;
      $('dem').textContent = ngay.data.length + ' lịch hôm nay, ' + nCho + ' chờ xác nhận';
    }
    // việc cần nhắc
    if (nhac.error) $('ds-nhac').replaceChildren(el('p',{class:'loi'},'Không tải được việc cần nhắc.'));
    else $('ds-nhac').replaceChildren(...(nhac.data.length ? nhac.data.map(n => {
      const tiem = n.loai_nhac === 'mui_tiem';
      const ghi = kenh => async ev => {
        const nutBam = ev.currentTarget; nutBam.disabled = true; baoLoi('');
        const { error } = await db.rpc('ghi_nhan_nhac', { p_lich: tiem ? null : n.lich_hen_id, p_mui_tiem: tiem ? n.mui_tiem_id : null, p_kenh: kenh, p_trang_thai: 'da_gui' });
        if (error) { nutBam.disabled = false; baoLoi(loiRpc(error)); return; } await tai(); };
      const d = new Date(n.thoi_diem).toLocaleDateString('en-GB',{day:'2-digit',month:'2-digit',timeZone:'Asia/Ho_Chi_Minh'});
      return el('div',{class:'nhac'},
        el('div',{style:'font-weight:700'}, tiem ? 'Tiêm ' + n.ten_dich_vu + ' cho ' + n.ten_thu_cung + ', nhắc lại ' + d : n.ten_thu_cung + ', lịch ' + d + ' ' + gio(n.thoi_diem)),
        el('div',{class:'nho',style:'margin-top:2px'}, n.ten_chu_nuoi + ', ' + sdt(n.so_dien_thoai)),
        el('div',{style:'margin-top:10px;display:flex;gap:16px;font-size:14px'},
          el('button',{class:'lien-ket',type:'button',style:'font-weight:700',onclick:ghi('dien_thoai')},'Đã gọi'),
          el('button',{class:'lien-ket',type:'button',onclick:ghi('email')},'Đã email')));
    }) : [el('p',{class:'ghi-chu'},'Không có việc cần nhắc.')]));
  }

  // hộp từ chối: thực chất là hủy lịch kèm lý do
  const hop = $('hop'); let dangXet = null;
  function moTuChoi(l){
    dangXet = l; $('ly-do').value = ''; $('hop-loi').hidden = true;
    $('hop-tieu').textContent = 'Từ chối lịch này?';
    $('hop-mo-ta').textContent = (l.thu_cung?.ten || '') + ', ' + gio(l.thoi_gian) + '. Lịch sẽ bị hủy và khung giờ được mở lại.';
    hop.showModal();
  }
  $('hop-dong').onclick = () => hop.close();
  $('form-hop').addEventListener('submit', async ev => {
    ev.preventDefault(); $('hop-xn').disabled = true;
    const { error } = await db.rpc('huy_lich', { p_lich: dangXet.id, p_ly_do: $('ly-do').value.trim() || null });
    $('hop-xn').disabled = false;
    if (error) { $('hop-loi').textContent = loiRpc(error); $('hop-loi').hidden = false; return; }
    hop.close(); await tai();
  });

  await tai();
})();
