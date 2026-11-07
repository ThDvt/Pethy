(async function(){
  const { db, el, gio } = Pethy, A = Pethy.admin, $ = A.$, { loiRpc } = Pethy.khu;
  if (!await A.boot('/admin/lich-hen.html')) return;
  const TT = { cho_xac_nhan:'Chờ xác nhận', da_xac_nhan:'Đã xác nhận', da_hoan_thanh:'Đã hoàn thành', da_huy:'Đã hủy', khong_den:'Không đến' };
  const KHOANG = { 'hom-nay':'Hôm nay', 'sap-toi':'7 ngày tới', 'thang-toi':'30 ngày tới', 'thang-qua':'30 ngày qua' };
  const cong = (d, n) => new Date(Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10) + n)).toISOString().slice(0, 10);
  const mocVN = d => new Date(d + 'T00:00:00+07:00').toISOString();
  const sdt = s => s ? s.replace(/^(\d{4})(\d{3})(\d+)$/, '$1 $2 $3') : '';
  const khoang = { 'hom-nay': h => [h, cong(h, 1)], 'sap-toi': h => [h, cong(h, 7)], 'thang-toi': h => [h, cong(h, 30)], 'thang-qua': h => [cong(h, -30), cong(h, 1)] };

  const bs = await db.from('tai_khoan').select('id,ho_ten').eq('vai_tro', 'bac_si').order('ho_ten');
  const tenBs = Object.fromEntries((bs.data || []).map(b => [b.id, b.ho_ten]));
  const chonKhoang = el('select', { id: 'f-khoang', 'aria-label': 'Khoảng thời gian', style: 'width:auto;min-width:170px' }, Object.entries(KHOANG).map(([k, v]) => el('option', { value: k, selected: k === 'sap-toi' }, v)));
  const chonTT = el('select', { id: 'f-tt', 'aria-label': 'Trạng thái', style: 'width:auto;min-width:170px' }, el('option', { value: '' }, 'Mọi trạng thái'), Object.entries(TT).map(([k, v]) => el('option', { value: k }, v)));
  const chonBs = el('select', { id: 'f-bs', 'aria-label': 'Bác sĩ', style: 'width:auto;min-width:170px' }, el('option', { value: '' }, 'Mọi bác sĩ'), (bs.data || []).map(b => el('option', { value: b.id }, b.ho_ten)));
  const ds = el('div', { style: 'border-top:2px solid var(--muc);margin-top:12px' });
  const dem = el('p', { class: 'nho', style: 'margin:12px 0 0', 'aria-live': 'polite' });
  const lenh = async (ten, args) => { A.baoLoi(''); const { error } = await db.rpc(ten, args); if (error) A.baoLoi(loiRpc(error)); await tai(); };

  function huy(l){
    const ly = el('input', { id: 'ly-do', maxlength: '200', placeholder: 'Ví dụ: khách báo bận' });
    A.hop('Hủy lịch hẹn', (l.thu_cung?.ten || '') + ', ' + A.ngay(l.thoi_gian) + ' ' + gio(l.thoi_gian), [A.o('ly-do', 'Lý do (không bắt buộc)', ly)], 'Hủy lịch', async () => {
      const { error } = await db.rpc('huy_lich', { p_lich: l.id, p_ly_do: ly.value.trim() || null });
      return error ? loiRpc(error) : null; }, tai);
  }
  function dong(l){
    const cn = l.thu_cung?.chu_nuoi || {}, qua = new Date(l.thoi_gian) <= new Date();
    const nut = [];
    if (l.trang_thai === 'cho_xac_nhan' && !qua) nut.push(el('button', { class: 'nut chinh', type: 'button', onclick: () => lenh('xac_nhan_lich', { p_lich: l.id }) }, 'Xác nhận'));
    if (l.trang_thai === 'da_xac_nhan' && qua) nut.push(el('button', { class: 'lien-ket', type: 'button', onclick: () => lenh('danh_dau_khong_den', { p_lich: l.id }) }, 'Không đến'));
    if (['cho_xac_nhan', 'da_xac_nhan'].includes(l.trang_thai)) nut.push(el('button', { class: 'lien-ket', type: 'button', onclick: () => huy(l) }, 'Hủy'));
    return el('div', { class: 'hang' },
      el('div', { class: 'nho so', style: 'flex:0 0 120px' }, A.ngay(l.thoi_gian), el('div', { style: 'font-weight:700;color:var(--muc)' }, gio(l.thoi_gian))),
      el('div', { class: 'ct', style: 'flex:2 1 180px' }, el('div', {}, el('span', { class: 'ten' }, l.thu_cung?.ten || ''), ', ' + (cn.ho_ten || 'Khách')), el('div', { class: 'nho so' }, sdt(cn.so_dien_thoai))),
      el('div', { style: 'flex:2 1 160px' }, l.dich_vu?.ten || '', el('div', { class: 'nho' }, 'Bác sĩ ' + (tenBs[l.bac_si_id] || ''))),
      el('div', { style: 'flex:0 0 130px' }, el('span', { class: 'tt' + (l.trang_thai === 'da_huy' || l.trang_thai === 'khong_den' ? ' do' : '') }, TT[l.trang_thai] || l.trang_thai)),
      el('div', { style: 'display:flex;gap:16px;align-items:center;justify-content:flex-end;flex:0 0 190px' }, ...nut));
  }
  async function tai(){
    const [tu, den] = khoang[chonKhoang.value](A.homNay());
    let q = db.from('lich_hen').select('id,thoi_gian,trang_thai,bac_si_id,thu_cung(ten,chu_nuoi(ho_ten,so_dien_thoai)),dich_vu(ten)', { count: 'exact' })
      .gte('thoi_gian', mocVN(tu)).lt('thoi_gian', mocVN(den)).order('thoi_gian', { ascending: chonKhoang.value !== 'thang-qua' }).limit(200);
    if (chonTT.value) q = q.eq('trang_thai', chonTT.value);
    if (chonBs.value) q = q.eq('bac_si_id', chonBs.value);
    const r = await q;
    if (r.error) return A.baoLoi('Không tải được lịch hẹn.');
    ds.replaceChildren(...((r.data || []).length ? r.data.map(dong) : [A.rong('Không có lịch hẹn nào trong khoảng này.')]));
    dem.textContent = (r.data || []).length ? (r.count > r.data.length ? 'Hiển thị ' + r.data.length + ' trong tổng số ' + r.count + ' lịch. Dùng bộ lọc để thu hẹp.' : r.count + ' lịch hẹn.') : '';
  }
  [chonKhoang, chonTT, chonBs].forEach(s => s.addEventListener('change', tai));
  $('vung').replaceChildren(el('div', { style: 'display:flex;flex-wrap:wrap;gap:12px;margin-top:20px' }, chonKhoang, chonTT, chonBs), dem, ds);
  await tai();
})();
