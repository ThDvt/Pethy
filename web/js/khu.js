// Khung chung cho khu vực sau đăng nhập: kiểm tra vai trò, thanh bên, thông báo lỗi.
(function(){
  const { db, thuc, el, KHU, vaiTro, dangXuat } = Pethy;

  // Lỗi từ hàm nghiệp vụ có dạng "MA_LOI: nội dung tiếng Việt". Chỉ hiện phần nội dung.
  function loiRpc(err){
    const m = (err && err.message) || '';
    const i = m.indexOf(': ');
    if (/^[A-Z0-9_]+: /.test(m) && i > 0) return m.slice(i + 2);
    if (err && (err.status === 429 || /rate|too many/i.test(m))) return 'Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút.';
    return 'Có lỗi xảy ra. Vui lòng thử lại.';
  }

  // Menu cố định của bốn vai nhân viên (mọi trang của vai đó dùng chung).
  const TRAO_DOI = {ten:'Trao đổi với quản trị',href:'/trao-doi.html'};
  const MENU_NV = {
    le_tan:[{ten:'Lịch trong ngày',href:'/le-tan/'},{ten:'Khách hàng',href:'/le-tan/khach-hang.html'},TRAO_DOI],
    bac_si:[{ten:'Lịch khám của tôi',href:'/bac-si/'},TRAO_DOI],
    thu_ngan:[{ten:'Thu ngân',href:'/thu-ngan/'},TRAO_DOI],
    kho:[{ten:'Tồn kho',href:'/kho/'},TRAO_DOI]
  };
  // muc: [{ten, href}], hien: href đang mở
  async function khoiDong(vaiCan, ten, muc, hien){
    const vt = await vaiTro();
    if (!vt) { location.replace('/dang-nhap.html'); return null; }
    if (vt !== vaiCan && vt !== 'admin') { location.replace(KHU[vt] || '/'); return null; }
    muc = MENU_NV[vaiCan] || muc;
    const nav = el('nav',{class:'thanh-ben','aria-label':'Khu vực'},
      el('div',{class:'ten'},'Pethy'),
      el('div',{class:'vai'}, ten),
      muc.map(m => el('a',{href:m.href,'aria-current': m.href === hien ? 'page' : null}, m.ten)),
      el('button',{class:'lien-ket dang-xuat',style:'color:#B8BAB4;text-align:left;font-size:15px;padding:10px 0',onclick:dangXuat},'Đăng xuất'));
    document.getElementById('khung-khu').prepend(nav);
    if (Pethy.thuc) giamSatNhanRoi(vt === 'chu_nuoi' ? 60 : 30);
    return vt;
  }
  // Hết phiên phía trình duyệt khi không thao tác (gói Supabase miễn phí không có hết phiên phía máy chủ).
  function giamSatNhanRoi(phut){
    let cuoi = Date.now();
    const ghi = () => { cuoi = Date.now(); };
    ['pointerdown','keydown','scroll','touchstart'].forEach(e => addEventListener(e, ghi, { passive: true }));
    const kiem = async () => {
      if (Date.now() - cuoi < phut * 60000) return;
      try { await Pethy.db.auth.signOut(); } finally { location.replace('/dang-nhap.html?het-phien=1'); }
    };
    setInterval(kiem, 30000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) kiem(); });
  }
  Pethy.khu = { loiRpc, khoiDong, MENU_NV };
})();
