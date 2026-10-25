(async function(){
  const { db, el } = Pethy, A = Pethy.admin, { loiRpc } = Pethy.khu, $ = A.$;
  const vt = await Pethy.vaiTro();
  if (!vt) { location.replace('/dang-nhap.html'); return; }
  if (!Pethy.khu.MENU_NV[vt]) { location.replace(vt === 'admin' ? '/admin/trao-doi.html' : (Pethy.KHU[vt] || '/')); return; }
  await Pethy.khu.khoiDong(vt, A.VAI[vt], [], '/trao-doi.html');
  const me = (await db.auth.getUser()).data?.user?.id;
  const gio = iso => new Date(iso).toLocaleString('vi-VN',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit',timeZone:'Asia/Ho_Chi_Minh'});
  const hop = el('div',{style:'max-height:55vh;overflow:auto;padding:12px 0;border-top:2px solid var(--muc);margin-top:20px'});
  const o = el('textarea',{rows:'2',placeholder:'Nhập tin nhắn rồi bấm Gửi',maxlength:'1000','aria-label':'Nội dung tin nhắn',style:'width:100%'});
  let dem = -1;
  async function tai(tuDong){
    const r = await db.from('tin_nhan').select('id,nguoi_gui_id,noi_dung,created_at').eq('nhan_vien_id', me).order('created_at');
    if (r.error) return A.baoLoi('Không tải được tin nhắn.');
    const d = r.data || [];
    if (tuDong === true && d.length === dem) return;
    dem = d.length;
    hop.replaceChildren(...(d.length ? d.map(t => el('div',{style:'margin:8px 0;display:flex;flex-direction:column;align-items:' + (t.nguoi_gui_id === me ? 'flex-end' : 'flex-start')},
      el('div',{style:'max-width:80%;padding:8px 12px;border:1px solid var(--muc);border-radius:2px;white-space:pre-wrap;word-break:break-word;' + (t.nguoi_gui_id === me ? 'background:var(--nen-nhat)' : '')}, t.noi_dung),
      el('div',{class:'nho'}, (t.nguoi_gui_id === me ? 'Bạn' : 'Quản trị') + ', ' + gio(t.created_at)))) : [A.rong('Chưa có tin nhắn. Hãy nhắn cho quản trị khi cần.')]));
    hop.scrollTop = hop.scrollHeight;
    await db.rpc('danh_dau_da_doc', { p_nhan_vien: me }); Pethy.khu.lamMoiSo();
  }
  const gui = async ev => { const nd = o.value.trim(); if (!nd) return; const nutBam = ev.currentTarget; nutBam.disabled = true; A.baoLoi('');
    const { error } = await db.rpc('gui_tin_nhan', { p_nhan_vien: me, p_noi_dung: nd });
    nutBam.disabled = false; if (error) return A.baoLoi(loiRpc(error)); o.value = ''; await tai(); };
  $('vung').replaceChildren(hop, el('div',{class:'soan-tin',style:'margin-top:12px'}, el('div',{style:'flex:1'}, o), el('button',{class:'nut chinh',type:'button',onclick:gui}, 'Gửi')));
  await tai();
  setInterval(() => { if (!document.hidden) tai(true); }, 15000);
})();
