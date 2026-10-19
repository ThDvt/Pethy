(async function(){
  const { db, el, gio, tien } = Pethy, { loiRpc, khoiDong } = Pethy.khu;
  const $ = id => document.getElementById(id);
  const MUC = [{ten:'Thu ngân',href:'/thu-ngan/'}];
  if (!await khoiDong('thu_ngan', 'Thu ngân', MUC, '/thu-ngan/')) return;

  const TT = {chua_thanh_toan:'Chưa thanh toán',thanh_toan_mot_phan:'Thanh toán một phần',da_thanh_toan:'Đã thanh toán'};
  const PT = {tien_mat:'Tiền mặt',chuyen_khoan:'Chuyển khoản'};
  const baoLoi = m => { $('loi-chung').textContent = m || ''; $('loi-chung').hidden = !m; };
  const ngay = iso => new Date(iso).toLocaleDateString('en-GB',{timeZone:'Asia/Ho_Chi_Minh'});
  const homNay = new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Ho_Chi_Minh'});
  const bay = new Date(Date.now() - 7 * 864e5).toISOString();
  const trong = (cha, noiDung) => cha.replaceChildren(...(noiDung.length ? noiDung : []));
  const rong = t => el('p',{class:'nho',style:'padding:14px 0'}, t);
  const da = h => (h.thanh_toan || []).reduce((s, t) => s + t.so_tien, 0);

  async function tai(){
    const [rl, rh, rn] = await Promise.all([
      db.from('lich_hen').select('id,thoi_gian,trang_thai,thu_cung(ten,chu_nuoi(ho_ten)),dich_vu(ten)').eq('trang_thai','da_hoan_thanh').gte('thoi_gian', bay).order('thoi_gian',{ascending:false}),
      db.from('hoa_don').select('id,lich_hen_id,tong_tien,trang_thai,created_at,thanh_toan(so_tien,phuong_thuc,thoi_gian),ct_hoa_don(mo_ta,so_luong,don_gia,thanh_tien),lich_hen(thu_cung(ten,chu_nuoi(ho_ten,so_dien_thoai)))').neq('trang_thai','da_huy').gte('created_at', bay).order('created_at',{ascending:false}),
      db.rpc('doanh_thu_theo_ngay', { p_tu: homNay, p_den: homNay })
    ]);
    if (rl.error || rh.error) { baoLoi('Không tải được dữ liệu. Vui lòng tải lại trang.'); return; }
    const hd = rh.data || [];
    const coHd = new Set(hd.map(h => h.lich_hen_id));
    const lap = (rl.data || []).filter(l => l.trang_thai === 'da_hoan_thanh' && !coHd.has(l.id));
    const chua = hd.filter(h => h.trang_thai === 'chua_thanh_toan' || h.trang_thai === 'thanh_toan_mot_phan');
    const xong = hd.filter(h => h.trang_thai === 'da_thanh_toan');

    trong($('ds-lap'), lap.length ? lap.map(l => el('div',{class:'hang'},
      el('div',{class:'ct'}, el('div',{}, el('span',{class:'ten'}, l.thu_cung?.ten), ', ' + (l.thu_cung?.chu_nuoi?.ho_ten || '')), el('div',{class:'nho'}, l.dich_vu?.ten + ', ' + ngay(l.thoi_gian) + ' ' + gio(l.thoi_gian))),
      el('button',{class:'nut chinh',type:'button',onclick:async ev => {
        ev.currentTarget.disabled = true; baoLoi('');
        const r = await db.rpc('lap_hoa_don', { p_lich: l.id });
        if (r.error) { baoLoi(loiRpc(r.error)); await tai(); return; }
        await tai();
        const moi = lastHd.find(x => x.id === r.data); if (moi) moHoaDon(moi);
      }}, 'Lập hóa đơn'))) : [rong('Không có lịch nào đang chờ lập hóa đơn.')]);

    const dongHd = h => el('div',{class:'hang'},
      el('div',{class:'ct'}, el('div',{}, el('span',{class:'ten'}, h.lich_hen?.thu_cung?.ten), ', ' + (h.lich_hen?.thu_cung?.chu_nuoi?.ho_ten || '')),
        el('div',{class:'nho'}, 'Lập ' + ngay(h.created_at) + ' ' + gio(h.created_at))),
      h.trang_thai === 'da_thanh_toan' ? el('span',{class:'tt'}, 'Đã thanh toán') : el('span',{class:'tt'}, TT[h.trang_thai]),
      el('div',{class:'tien'}, tien(h.trang_thai === 'da_thanh_toan' ? h.tong_tien : h.tong_tien - da(h))),
      el('button',{class:'nut',type:'button',onclick:() => moHoaDon(h)}, h.trang_thai === 'da_thanh_toan' ? 'Xem' : 'Thu tiền'));
    trong($('ds-thu'), chua.length ? chua.map(dongHd) : [rong('Không có hóa đơn nào cần thu.')]);
    trong($('ds-xong'), xong.length ? xong.map(dongHd) : [rong('Chưa có hóa đơn nào được thanh toán đủ.')]);
    lastHd = hd;

    const r = (!rn.error && rn.data && rn.data[0]) || { so_giao_dich: 0, tong_thu: 0, tien_mat: 0, chuyen_khoan: 0 };
    $('hom-nay').replaceChildren(
      el('div',{class:'so-thu',style:'font-size:34px;font-weight:500'}, tien(r.tong_thu)),
      el('div',{class:'nho',style:'margin-top:4px'}, r.so_giao_dich + ' lần thu'),
      el('div',{style:'margin-top:20px;border-top:2px solid var(--muc)'},
        ...[['Tiền mặt', r.tien_mat], ['Chuyển khoản', r.chuyen_khoan]].map(([t, v]) =>
          el('div',{style:'display:flex;justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--vach)'}, el('span',{}, t), el('span',{class:'so'}, tien(v))))));
  }
  let lastHd = [];

  function moHoaDon(h){
    const hop = $('hop'), con = h.tong_tien - da(h);
    const loi = el('p',{class:'loi',role:'alert',hidden:true});
    const ml = m => { loi.textContent = m || ''; loi.hidden = !m; };
    const dong = () => hop.close();
    const sotien = el('input',{id:'st',inputmode:'numeric',value:con,class:'so'});
    const pt = el('select',{id:'pt'}, Object.entries(PT).map(([k, v]) => el('option',{value:k}, v)));
    const thu = h.trang_thai === 'chua_thanh_toan' || h.trang_thai === 'thanh_toan_mot_phan';
    $('hop-nd').replaceChildren(...[
      el('h2',{style:'margin:0;font-size:22px'}, 'Hóa đơn của ' + (h.lich_hen?.thu_cung?.ten || '')),
      el('div',{class:'nho',style:'margin:4px 0 16px'}, (h.lich_hen?.thu_cung?.chu_nuoi?.ho_ten || '') + (h.lich_hen?.thu_cung?.chu_nuoi?.so_dien_thoai ? ', ' + h.lich_hen.thu_cung.chu_nuoi.so_dien_thoai : '')),
      el('div',{style:'border-top:2px solid var(--muc)'}, ...(h.ct_hoa_don || []).map(c =>
        el('div',{class:'ct-hd'}, el('div',{class:'m'}, c.mo_ta + (c.so_luong > 1 ? ' x ' + c.so_luong : '')), el('div',{class:'s'}, tien(c.thanh_tien))))),
      el('div',{class:'tong'}, el('span',{}, 'Tổng cộng'), el('span',{class:'so'}, tien(h.tong_tien))),
      (h.thanh_toan || []).length ? el('div',{style:'margin-bottom:12px'}, el('div',{class:'nho',style:'font-weight:700;margin-bottom:4px'}, 'Đã thu'),
        ...h.thanh_toan.map(t => el('div',{class:'ct-hd'}, el('div',{class:'m'}, ngay(t.thoi_gian) + ' ' + gio(t.thoi_gian) + ', ' + PT[t.phuong_thuc]), el('div',{class:'s'}, tien(t.so_tien))))) : null,
      thu ? el('div',{},
        el('div',{style:'display:flex;justify-content:space-between;margin-bottom:12px;font-weight:700'}, el('span',{}, 'Còn lại'), el('span',{class:'so'}, tien(con))),
        el('div',{style:'display:flex;flex-wrap:wrap;gap:12px 16px'},
          el('div',{class:'truong',style:'flex:1 1 160px;margin:0'}, el('label',{for:'st'}, 'Số tiền thu (đ)'), sotien),
          el('div',{class:'truong',style:'flex:1 1 160px;margin:0'}, el('label',{for:'pt'}, 'Phương thức'), pt)),
        loi) : null,
      el('div',{style:'display:flex;flex-wrap:wrap;gap:12px 20px;justify-content:space-between;align-items:center;margin-top:20px'},
        thu && h.trang_thai === 'chua_thanh_toan' ? el('button',{class:'lien-ket',type:'button',onclick:async ev => {
          if (!confirm('Hủy hóa đơn này để lập lại?')) return;
          ev.currentTarget.disabled = true; ml('');
          const { error } = await db.rpc('huy_hoa_don', { p_hoa_don: h.id });
          if (error) { ev.currentTarget.disabled = false; return ml(loiRpc(error)); }
          dong(); await tai(); }}, 'Hủy hóa đơn') : el('span'),
        el('div',{style:'display:flex;gap:16px;align-items:center'},
          el('button',{class:'lien-ket',type:'button',onclick:dong}, 'Đóng'),
          thu ? el('button',{class:'nut chinh',type:'button',onclick:async ev => {
            ml(''); const v = Number(String(sotien.value).replace(/[.\s]/g, ''));
            if (!Number.isInteger(v) || v <= 0) return ml('Số tiền thu phải là số nguyên lớn hơn 0.');
            if (v > con) return ml('Số tiền thu vượt quá số còn lại.');
            ev.currentTarget.disabled = true;
            const { error } = await db.rpc('ghi_thanh_toan', { p_hoa_don: h.id, p_so_tien: v, p_phuong_thuc: pt.value });
            if (error) { ev.currentTarget.disabled = false; return ml(loiRpc(error)); }
            dong(); await tai(); }}, 'Ghi nhận thu tiền') : null))].filter(Boolean));
    hop.showModal();
  }

  await tai();
})();
