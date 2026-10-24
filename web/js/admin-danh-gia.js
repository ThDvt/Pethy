(async function(){
  const { db, el } = Pethy, A = Pethy.admin, { loiRpc } = Pethy.khu, $ = A.$;
  if (!await A.boot('/admin/danh-gia.html')) return;
  const ngay = iso => new Date(iso).toLocaleDateString('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric',timeZone:'Asia/Ho_Chi_Minh'});
  async function tai(){
    const [r, bs] = await Promise.all([
      db.from('danh_gia').select('id,so_sao,nhan_xet,hien_thi,created_at,lich_hen(bac_si_id,thu_cung(ten,chu_nuoi(ho_ten)),dich_vu(ten))').order('created_at',{ascending:false}).limit(100),
      db.from('bac_si_cong_khai').select('id,ho_ten')
    ]);
    if (r.error) return A.baoLoi('Không tải được danh sách đánh giá.');
    const tenBs = Object.fromEntries((bs.data || []).map(b => [b.id, b.ho_ten]));
    const ds = r.data || [];
    const hien = ds.filter(x => x.hien_thi);
    const tb = hien.length ? hien.reduce((t, x) => t + x.so_sao, 0) / hien.length : 0;
    const dat = async (x, h) => {
      A.baoLoi('');
      if (!h && !await Pethy.xacNhan('Ẩn đánh giá này?', 'Đánh giá sẽ không còn hiện trên trang chủ và không tính vào điểm trung bình. Bạn có thể hiện lại sau.', 'Có, ẩn đánh giá')) return;
      const { error } = await db.rpc('an_hien_danh_gia', { p_id: x.id, p_hien: h });
      if (error) A.baoLoi(loiRpc(error)); await tai();
    };
    $('vung').replaceChildren(
      el('div',{class:'nho',style:'margin:16px 0 8px'}, ds.length ? ('Đang hiện ' + hien.length + ' đánh giá, điểm trung bình ' + tb.toFixed(1) + ' trên 5.') : ''),
      el('div',{style:'border-top:2px solid var(--muc)'}, ...(ds.length ? ds.map(x => {
        const l = x.lich_hen || {};
        return el('div',{class:'hang',style:x.hien_thi ? '' : 'opacity:.6'},
          el('div',{class:'ten',style:'flex:1'},
            el('div',{style:'display:flex;align-items:center;gap:10px'}, Pethy.sao(x.so_sao), x.hien_thi ? null : el('span',{class:'tt do'}, 'Đã ẩn')),
            el('div',{style:'font-weight:400;margin-top:4px;white-space:pre-line'}, x.nhan_xet || 'Không có nhận xét.'),
            el('div',{class:'nho',style:'font-weight:400;margin-top:4px'}, [l.thu_cung?.chu_nuoi?.ho_ten, l.dich_vu?.ten, tenBs[l.bac_si_id] ? 'Bs. ' + tenBs[l.bac_si_id] : null, ngay(x.created_at)].filter(Boolean).join(', '))),
          el('button',{class:'lien-ket',type:'button',onclick:() => dat(x, !x.hien_thi)}, x.hien_thi ? 'Ẩn' : 'Hiện lại'));
      }) : [A.rong('Chưa có đánh giá nào. Chủ nuôi đánh giá được sau mỗi lần khám hoàn thành.')])));
  }
  await tai();
})();
