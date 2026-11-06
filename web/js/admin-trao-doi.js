(async function(){
  const { db, el } = Pethy, A = Pethy.admin, { loiRpc } = Pethy.khu, $ = A.$, H = Pethy.hopTin;
  if (!await A.boot('/admin/trao-doi.html')) return;
  const me = (await db.auth.getUser()).data?.user?.id;
  let chon = null, pane = null, dem = -1, luong = null, anhBs = {};
  const goc = el('div', { class: 'tn' }), dsLuong = el('div', { class: 'tn-ds', role: 'list', 'aria-label': 'Danh sách nhân viên' }),
    vungChat = el('div', { class: 'tn-chat', hidden: true }), chuaChon = el('div', { class: 'tn-rong' }, 'Chọn một nhân viên để xem trao đổi.');
  goc.append(dsLuong, vungChat, chuaChon);

  async function taiLuong(){
    const [r, a] = await Promise.all([db.from('hop_thu_noi_bo').select('nhan_vien_id,ho_ten,vai_tro,tin_cuoi,thoi_diem_cuoi,chua_doc'),
      db.from('ho_so_bac_si').select('tai_khoan_id,anh_dai_dien').not('anh_dai_dien', 'is', null)]);
    if (r.error) return A.baoLoi('Không tải được hộp thư.');
    if (!a.error) anhBs = Object.fromEntries((a.data || []).map(z => [z.tai_khoan_id, z.anh_dai_dien])); // lỗi thì giữ chữ cái, không chặn hộp thư
    const d = (r.data || []).slice().sort((a, b) => String(b.thoi_diem_cuoi || '').localeCompare(String(a.thoi_diem_cuoi || '')));
    dsLuong.replaceChildren(...(d.length ? d.map(x => {
      const dangChon = chon && chon.nhan_vien_id === x.nhan_vien_id, coMoi = x.chua_doc > 0;
      return el('button', { type: 'button', class: 'tn-muc' + (coMoi ? ' chua-doc' : ''), 'data-id': x.nhan_vien_id, 'aria-current': dangChon ? 'true' : null, onclick: () => mo(x) },
        H.avatar(x.ho_ten, anhBs[x.nhan_vien_id]),
        el('div', { class: 'tn-thong' },
          el('div', { class: 'tn-hang1' }, el('span', { class: 'tn-ten' }, x.ho_ten), el('span', { class: 'tn-t' }, H.nhanGon(x.thoi_diem_cuoi))),
          el('div', { class: 'tn-vai' }, A.VAI[x.vai_tro]),
          el('div', { class: 'tn-hang2' }, el('span', { class: 'tn-xem' }, x.tin_cuoi || 'Chưa có tin nhắn'), coMoi ? el('span', { class: 'tn-so', 'aria-label': x.chua_doc + ' tin chưa đọc' }, String(x.chua_doc)) : null)));
    }) : [A.rong('Chưa có tài khoản nhân viên nào.')]));
  }

  // Khung chat dựng một lần cho mỗi nhân viên được chọn; làm mới tự động chỉ thay danh sách tin, nên không mất chữ đang gõ.
  function dungKhung(x){
    const tin = el('div', { class: 'tn-tin', 'aria-live': 'polite' });
    const soan = H.soanTin(async nd => {
      A.baoLoi('');
      const { error } = await db.rpc('gui_tin_nhan', { p_nhan_vien: x.nhan_vien_id, p_noi_dung: nd });
      if (error) { A.baoLoi(loiRpc(error)); return false; }
      await taiTin(false, true); await taiLuong();
    });
    const lui = el('button', { type: 'button', class: 'tn-lui', 'aria-label': 'Quay lại danh sách', onclick: () => { goc.classList.remove('dang-chat'); chon = null; taiLuong(); } });
    lui.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M20 11H7.8l5.6-5.6L12 4l-8 8 8 8 1.4-1.4L7.8 13H20z"/></svg>';
    vungChat.replaceChildren(el('div', { class: 'tn-dau' }, lui, H.avatar(x.ho_ten, anhBs[x.nhan_vien_id]), el('div', {}, el('div', { class: 'tn-ten' }, x.ho_ten), el('div', { class: 'tn-vai' }, A.VAI[x.vai_tro]))), tin, soan.khung);
    return { tin, soan };
  }
  async function mo(x){
    chon = x; goc.classList.add('dang-chat');
    // đổi viền cam ngay khi bấm, không chờ tải tin nhắn xong
    dsLuong.querySelectorAll('.tn-muc').forEach(n => { if (n.dataset.id === String(x.nhan_vien_id)) n.setAttribute('aria-current', 'true'); else n.removeAttribute('aria-current'); }); vungChat.hidden = false; chuaChon.hidden = true;
    pane = dungKhung(x); luong = null; dem = -1;
    await taiTin(false, true); await taiLuong();
    if (matchMedia('(pointer:fine)').matches) pane.soan.o.focus();
  }
  async function taiTin(tuDong, cuonXuong){
    if (!chon || !pane) return;
    const id = chon.nhan_vien_id, p = pane;
    const r = await db.from('tin_nhan').select('id,nguoi_gui_id,noi_dung,created_at').eq('nhan_vien_id', id).order('created_at');
    if (r.error) return A.baoLoi('Không tải được tin nhắn.');
    if (p !== pane) return; // đã chuyển sang nhân viên khác
    const d = r.data || [];
    if (tuDong === true && luong === id && dem === d.length) return;
    const dauTien = luong !== id, cuoi = H.gancCuoi(p.tin), cu = dem;
    luong = id; dem = d.length;
    p.tin.replaceChildren(...(d.length ? H.dungTin(d, me, dauTien ? null : cu) : [el('div', { class: 'tn-trong' }, 'Chưa có tin nhắn. Hãy nhắn trước.')]));
    if (dauTien || cuonXuong || cuoi) H.cuonCuoi(p.tin, !dauTien);
    await db.rpc('danh_dau_da_doc', { p_nhan_vien: id }); Pethy.khu.lamMoiSo();
  }
  $('vung').replaceChildren(goc); H.phuManHinh(goc);
  await taiLuong();
  setInterval(() => { if (!document.hidden) { taiLuong(); if (chon) taiTin(true); } }, 15000); // dự phòng
  document.addEventListener('pethy:doi', e => { if (e.detail.bang === 'tin_nhan') { taiLuong(); if (chon) taiTin(true); } }); // tin mới tới là hiện ngay
})();
