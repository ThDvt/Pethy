(async function(){
  const { db, el } = Pethy, A = Pethy.admin, { loiRpc } = Pethy.khu, $ = A.$, H = Pethy.hopTin;
  const vt = await Pethy.vaiTro();
  if (!vt) { location.replace('/dang-nhap.html'); return; }
  if (!Pethy.khu.MENU_NV[vt]) { location.replace(vt === 'admin' ? '/admin/trao-doi.html' : (Pethy.KHU[vt] || '/')); return; }
  await Pethy.khu.khoiDong(vt, A.VAI[vt], [], '/trao-doi.html');
  const me = (await db.auth.getUser()).data?.user?.id;
  const tin = el('div', { class: 'tn-tin', 'aria-live': 'polite' });
  let dem = -1;
  async function tai(tuDong, cuonXuong){
    const r = await db.from('tin_nhan').select('id,nguoi_gui_id,noi_dung,created_at').eq('nhan_vien_id', me).order('created_at');
    if (r.error) return A.baoLoi('Không tải được tin nhắn.');
    const d = r.data || [];
    if (tuDong === true && d.length === dem) return;
    const dauTien = dem === -1, cuoi = H.gancCuoi(tin), cu = dem;
    dem = d.length;
    tin.replaceChildren(...(d.length ? H.dungTin(d, me, dauTien ? null : cu) : [el('div', { class: 'tn-trong' }, 'Chưa có tin nhắn. Hãy nhắn cho quản trị khi cần.')]));
    if (dauTien || cuonXuong || cuoi) H.cuonCuoi(tin, !dauTien);
    await db.rpc('danh_dau_da_doc', { p_nhan_vien: me }); Pethy.khu.lamMoiSo();
  }
  const soan = H.soanTin(async nd => {
    A.baoLoi('');
    const { error } = await db.rpc('gui_tin_nhan', { p_nhan_vien: me, p_noi_dung: nd });
    if (error) { A.baoLoi(loiRpc(error)); return false; }
    await tai(false, true);
  });
  const goc = el('div', { class: 'tn mot-cot dang-chat' }, el('div', { class: 'tn-chat' },
    el('div', { class: 'tn-dau' }, H.avatar('Quản trị'), el('div', {}, el('div', { class: 'tn-ten' }, 'Quản trị phòng khám'), el('div', { class: 'tn-vai' }, 'Chỉ bạn và quản trị đọc được'))), tin, soan.khung));
  $('vung').replaceChildren(goc); H.phuManHinh(goc);
  await tai();
  setInterval(() => { if (!document.hidden) tai(true); }, 15000);
})();
