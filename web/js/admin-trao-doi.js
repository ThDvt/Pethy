(async function(){
  const { db, el } = Pethy, A = Pethy.admin, { loiRpc } = Pethy.khu, $ = A.$;
  if (!await A.boot('/admin/trao-doi.html')) return;
  const me = (await db.auth.getUser()).data?.user?.id;
  let chon = null;
  const dsLuong = el('div',{style:'flex:0 0 260px;border-top:2px solid var(--muc)'}), khung = el('div',{style:'flex:1 1 320px;min-width:0'});
  const gio = iso => new Date(iso).toLocaleString('vi-VN',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit',timeZone:'Asia/Ho_Chi_Minh'});
  async function taiLuong(){
    const r = await db.from('hop_thu_noi_bo').select('nhan_vien_id,ho_ten,vai_tro,tin_cuoi,thoi_diem_cuoi,chua_doc');
    if (r.error) return A.baoLoi('Không tải được hộp thư.');
    const d = (r.data || []).slice().sort((a, b) => String(b.thoi_diem_cuoi || '').localeCompare(String(a.thoi_diem_cuoi || '')));
    dsLuong.replaceChildren(...(d.length ? d.map(x => el('button',{type:'button',class:'hang',style:'width:100%;text-align:left;background:' + (chon && chon.nhan_vien_id === x.nhan_vien_id ? 'var(--nen-nhat)' : 'none') + ';border-left:0;border-right:0;border-top:0;cursor:pointer;display:block',onclick:() => { chon = x; taiLuong(); taiTin(); }},
      el('div',{style:'font-weight:700;display:flex;justify-content:space-between'}, el('span',{}, x.ho_ten), x.chua_doc > 0 ? el('span',{class:'tt do'}, String(x.chua_doc)) : ''),
      el('div',{class:'nho'}, A.VAI[x.vai_tro]), el('div',{class:'nho',style:'overflow:hidden;text-overflow:ellipsis;white-space:nowrap'}, x.tin_cuoi || 'Chưa có tin nhắn'))) : [A.rong('Chưa có tài khoản nhân viên nào.')]));
  }
  let dem = -1, luong = null;
  async function taiTin(tuDong){
    if (!chon) return khung.replaceChildren(A.rong('Chọn một nhân viên để xem trao đổi.'));
    const id = chon.nhan_vien_id;
    const r = await db.from('tin_nhan').select('id,nguoi_gui_id,noi_dung,created_at').eq('nhan_vien_id', id).order('created_at');
    if (r.error) return A.baoLoi('Không tải được tin nhắn.');
    if (tuDong === true && luong === id && dem === (r.data || []).length) return;
    luong = id; dem = (r.data || []).length;
    const o = el('textarea',{rows:'2',placeholder:'Nhập tin nhắn rồi bấm Gửi',maxlength:'1000','aria-label':'Nội dung tin nhắn',style:'width:100%'});
    const gui = async ev => { const nd = o.value.trim(); if (!nd) return; const nutBam = ev.currentTarget; nutBam.disabled = true; A.baoLoi('');
      const { error } = await db.rpc('gui_tin_nhan', { p_nhan_vien: id, p_noi_dung: nd }); if (error) A.baoLoi(loiRpc(error)); await taiTin(); await taiLuong(); };
    const hop = el('div',{style:'max-height:50vh;overflow:auto;padding:12px 0'}, ...((r.data || []).length ? r.data.map(t => el('div',{style:'margin:8px 0;display:flex;flex-direction:column;align-items:' + (t.nguoi_gui_id === me ? 'flex-end' : 'flex-start')},
      el('div',{style:'max-width:80%;padding:8px 12px;border:1px solid var(--muc);border-radius:2px;white-space:pre-wrap;word-break:break-word;' + (t.nguoi_gui_id === me ? 'background:var(--nen-nhat)' : '')}, t.noi_dung),
      el('div',{class:'nho'}, gio(t.created_at)))) : [A.rong('Chưa có tin nhắn. Hãy nhắn trước.')]));
    khung.replaceChildren(el('div',{style:'font-weight:800;font-size:18px;border-bottom:2px solid var(--muc);padding-bottom:8px'}, chon.ho_ten), hop,
      el('div',{class:'soan-tin'}, el('div',{style:'flex:1'}, o), el('button',{class:'nut chinh',type:'button',onclick:gui}, 'Gửi')));
    hop.scrollTop = hop.scrollHeight;
    await db.rpc('danh_dau_da_doc', { p_nhan_vien: id }); Pethy.khu.lamMoiSo();
  }
  $('vung').replaceChildren(el('div',{style:'display:flex;flex-wrap:wrap;gap:24px;margin-top:20px'}, dsLuong, khung));
  await taiLuong(); await taiTin();
  setInterval(() => { if (!document.hidden) { taiLuong(); if (chon) taiTin(true); } }, 15000);
})();
