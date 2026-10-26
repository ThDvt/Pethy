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
  const TRAO_DOI = {ten:'Tin nhắn',href:'/trao-doi.html'};
  const MENU_NV = {
    le_tan:[{ten:'Lịch hôm nay',href:'/le-tan/'},{ten:'Khách hàng',href:'/le-tan/khach-hang.html'},TRAO_DOI],
    bac_si:[{ten:'Lịch khám',href:'/bac-si/'},{ten:'Hồ sơ của tôi',href:'/bac-si/ho-so.html'},TRAO_DOI],
    thu_ngan:[{ten:'Thu ngân',href:'/thu-ngan/'},TRAO_DOI],
    kho:[{ten:'Tồn kho',href:'/kho/'},TRAO_DOI]
  };
  const tenNguoi = () => { try { return (JSON.parse(sessionStorage.getItem('pethy.menu') || 'null') || {}).nguoi || ''; } catch (e) { return ''; } };
  // Lấy họ tên người đang đăng nhập để hiện ở chân thanh bên, rồi nhớ cho các trang sau.
  async function hienTenNguoi(){
    try {
      const u = (await db.auth.getUser()).data?.user; if (!u) return;
      const r = await db.from('tai_khoan').select('ho_ten').eq('id', u.id).maybeSingle();
      const ten = r.data && r.data.ho_ten; if (!ten) return;
      const tn = document.querySelector('.thanh-ben .tb-tn'), av = document.querySelector('.thanh-ben .tb-av');
      if (tn) tn.textContent = ten; if (av) av.textContent = ten.trim().charAt(0).toUpperCase();
      const c = JSON.parse(sessionStorage.getItem('pethy.menu') || 'null'); if (c) { c.nguoi = ten; sessionStorage.setItem('pethy.menu', JSON.stringify(c)); }
    } catch (e) {}
  }
  // muc: [{ten, href}], hien: href đang mở
  async function khoiDong(vaiCan, ten, muc, hien){
    muc = MENU_NV[vaiCan] || muc;
    // Dựng thanh bên ngay, không chờ kiểm tra vai trò: người dùng thấy khung trang tức thì.
    const nav = window.PethyThanhBen.dung({ goc: KHU[vaiCan], ten, muc, hien, nguoi: tenNguoi() });
    const cu = document.querySelector('#khung-khu > .thanh-ben');
    if (cu) cu.replaceWith(nav); else document.getElementById('khung-khu').prepend(nav);
    try { sessionStorage.setItem('pethy.menu', JSON.stringify({ goc: KHU[vaiCan], ten, muc, nguoi: tenNguoi() })); } catch (e) {}
    const vt = await vaiTro();
    if (!vt) { location.replace('/dang-nhap.html'); return null; }
    if (vt !== vaiCan && vt !== 'admin') { location.replace(KHU[vt] || '/'); return null; }
    hienTenNguoi(); batDauDemSo(vaiCan);
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
      try { sessionStorage.removeItem('pethy.menu'); await Pethy.db.auth.signOut(); } finally { location.replace('/dang-nhap.html?het-phien=1'); }
    };
    setInterval(kiem, 30000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) kiem(); });
  }
  // Số mục mới ở thanh bên (tin nhắn chưa đọc, việc đang chờ). Chỉ dùng dữ liệu người dùng vốn được phép đọc.
  const NGAY_VN = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
  const dem = r => (r && !r.error) ? (typeof r.count === 'number' ? r.count : (r.data || []).length) : 0;
  const DEM_HEAD = { count: 'exact', head: true };
  let vaiHienTai = null, dangDem = false;
  async function demSo(vai){
    const me = (await db.auth.getUser()).data?.user?.id; if (!me) return [];
    const kq = [];
    if (vai === 'admin' || MENU_NV[vai]) {
      const [tn, doc] = await Promise.all([
        db.from('tin_nhan').select('nhan_vien_id,nguoi_gui_id,created_at').gte('created_at', new Date(Date.now() - 30 * 864e5).toISOString()).order('created_at', { ascending: false }).limit(500),
        db.from('doc_tin_nhan').select('nhan_vien_id,doc_den').eq('tai_khoan_id', me)]);
      const moc = {}; ((doc && doc.data) || []).forEach(d => { moc[d.nhan_vien_id] = d.doc_den; });
      const n = ((tn && tn.data) || []).filter(t => t.nguoi_gui_id !== me && (!moc[t.nhan_vien_id] || t.created_at > moc[t.nhan_vien_id])).length;
      kq.push([vai === 'admin' ? '/admin/trao-doi.html' : '/trao-doi.html', n]);
    }
    if (vai === 'le_tan') kq.push(['/le-tan/', dem(await db.from('lich_hen').select('id', DEM_HEAD).eq('trang_thai', 'cho_xac_nhan').gte('thoi_gian', new Date().toISOString()))]);
    if (vai === 'bac_si') {
      const d = NGAY_VN(), dau = new Date(d + 'T00:00:00+07:00');
      kq.push(['/bac-si/', dem(await db.from('lich_hen').select('id', DEM_HEAD).eq('bac_si_id', me).eq('trang_thai', 'da_xac_nhan').gte('thoi_gian', dau.toISOString()).lt('thoi_gian', new Date(dau.getTime() + 864e5).toISOString()))]);
    }
    if (vai === 'thu_ngan') kq.push(['/thu-ngan/', dem(await db.from('hoa_don').select('id', DEM_HEAD).in('trang_thai', ['chua_thanh_toan', 'thanh_toan_mot_phan']))]);
    if (vai === 'kho') kq.push(['/kho/', dem(await db.from('canh_bao_kho').select('loai_canh_bao', DEM_HEAD))]);
    if (vai === 'chu_nuoi') kq.push(['/chu-nuoi/hoa-don.html', dem(await db.from('hoa_don').select('id', DEM_HEAD).in('trang_thai', ['chua_thanh_toan', 'thanh_toan_mot_phan']))]);
    return kq;
  }
  async function lamMoiSo(){
    if (!vaiHienTai || dangDem || !window.PethyThanhBen) return;
    dangDem = true;
    try { (await demSo(vaiHienTai)).forEach(([href, n]) => window.PethyThanhBen.datSo(href, n)); } catch (e) {} finally { dangDem = false; }
  }
  function batDauDemSo(vai){
    vaiHienTai = vai; lamMoiSo();
    setInterval(() => { if (!document.hidden) lamMoiSo(); }, 60000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) lamMoiSo(); });
  }
  Pethy.khu = { loiRpc, khoiDong, MENU_NV, lamMoiSo };
})();
