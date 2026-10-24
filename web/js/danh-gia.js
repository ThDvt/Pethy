// Đánh giá: hiển thị sao và hộp thoại gửi đánh giá của chủ nuôi.
(function(){
  const { el } = Pethy;
  // Chuỗi sao tĩnh, kèm nhãn đọc cho trình đọc màn hình ("4 trên 5 sao").
  Pethy.sao = (n, lop) => el('span',{class:'sao' + (lop ? ' ' + lop : ''),role:'img','aria-label':n + ' trên 5 sao'},
    ...[1,2,3,4,5].map(i => el('i',{class:i <= Math.round(n) ? 'day' : ''}, '★')));
  const NHAN = ['', 'Chưa hài lòng', 'Tạm được', 'Bình thường', 'Hài lòng', 'Rất hài lòng'];

  // lich: {id, thu_cung_ten, bac_si_ten, dich_vu_ten}; cu: {so_sao, nhan_xet} nếu đã đánh giá; xong: chạy sau khi lưu thành công.
  Pethy.hopDanhGia = function(lich, cu, xong){
    let sao = cu ? cu.so_sao : 0;
    const d = el('dialog',{class:'hop-dg','aria-labelledby':'dg-tieu'});
    const loi = el('p',{class:'loi',role:'alert',hidden:true});
    const nhan = el('div',{class:'dg-nhan','aria-live':'polite'}, sao ? NHAN[sao] : 'Chạm vào sao để chọn');
    const nut = [1,2,3,4,5].map(i => {
      const b = el('button',{type:'button',class:'dg-sao',role:'radio','aria-checked':String(i === sao),'aria-label':i + ' sao, ' + NHAN[i]}, '★');
      b.addEventListener('click', () => chon(i)); return b;
    });
    const nhom = el('div',{class:'dg-nhom',role:'radiogroup','aria-label':'Số sao'}, ...nut);
    function chon(n){ sao = n; nut.forEach((b, i) => { b.classList.toggle('day', i < n); b.setAttribute('aria-checked', String(i + 1 === n)); }); nhan.textContent = NHAN[n]; }
    const nx = el('textarea',{id:'dg-nx',rows:'4',maxlength:'500',placeholder:'Chia sẻ thêm về lần khám (không bắt buộc)'}); nx.value = (cu && cu.nhan_xet) || '';
    const gui = el('button',{class:'nut chinh',type:'button'}, cu ? 'Lưu đánh giá' : 'Gửi đánh giá');
    const dong = () => { d.close(); d.remove(); };
    gui.addEventListener('click', async () => {
      loi.hidden = true;
      if (!sao) { loi.textContent = 'Vui lòng chọn số sao.'; loi.hidden = false; return; }
      gui.disabled = true;
      const { error } = await Pethy.db.rpc('gui_danh_gia', { p_lich: lich.id, p_so_sao: sao, p_nhan_xet: nx.value.trim() || null });
      gui.disabled = false;
      if (error) { loi.textContent = Pethy.khu.loiRpc(error); loi.hidden = false; return; }
      dong(); if (xong) await xong();
    });
    d.append(el('h2',{id:'dg-tieu',style:'margin:0 0 4px;font-size:22px'}, 'Lần khám của ' + (lich.thu_cung_ten || 'bé') + ' thế nào?'),
      el('p',{class:'ghi-chu',style:'margin:0 0 16px'}, [lich.dich_vu_ten, lich.bac_si_ten ? 'Bs. ' + lich.bac_si_ten : null].filter(Boolean).join(', ')),
      nhom, nhan,
      el('div',{class:'truong',style:'margin-top:16px'}, el('label',{for:'dg-nx'}, 'Nhận xét'), nx),
      el('p',{class:'ghi-chu',style:'margin:0 0 8px'}, 'Nhận xét có thể hiện trên trang chủ cùng tên rút gọn của bạn, không kèm số điện thoại hay tên thú cưng.'),
      loi,
      el('div',{style:'display:flex;gap:12px;justify-content:flex-end;margin-top:16px'},
        el('button',{class:'nut phu',type:'button',onclick:dong}, 'Để sau'), gui));
    d.addEventListener('cancel', ev => { ev.preventDefault(); dong(); });
    document.body.append(d); d.showModal(); chon(sao);
  };
})();
