// Khung chung cho khu quản trị.
Pethy.admin = (function(){
  const { el } = Pethy;
  const MUC = [
    {ten:'Tổng quan',href:'/admin/',nhom:'CHÍNH'},{ten:'Lịch hẹn',href:'/admin/lich-hen.html',nhom:'CHÍNH'},{ten:'Doanh thu',href:'/admin/doanh-thu.html',nhom:'CHÍNH'},
    {ten:'Tài khoản',href:'/admin/tai-khoan.html',nhom:'QUẢN LÝ'},{ten:'Dịch vụ',href:'/admin/dich-vu.html',nhom:'QUẢN LÝ'},{ten:'Lịch làm',href:'/admin/lich-lam-viec.html',nhom:'QUẢN LÝ'},{ten:'Tham số',href:'/admin/tham-so.html',nhom:'QUẢN LÝ'},
    {ten:'Đánh giá',href:'/admin/danh-gia.html',nhom:'QUẢN LÝ'},{ten:'Bài viết',href:'/admin/bai-viet.html',nhom:'QUẢN LÝ'},
    {ten:'Lễ tân',href:'/le-tan/',nhom:'KHU LÀM VIỆC'},{ten:'Bác sĩ',href:'/bac-si/',nhom:'KHU LÀM VIỆC'},{ten:'Thu ngân',href:'/thu-ngan/',nhom:'KHU LÀM VIỆC'},{ten:'Thủ kho',href:'/kho/',nhom:'KHU LÀM VIỆC'},
    {ten:'Nhật ký',href:'/admin/nhat-ky.html',nhom:'HỆ THỐNG'},{ten:'Tin nhắn',href:'/admin/trao-doi.html',nhom:'HỆ THỐNG'},{ten:'Bảo mật',href:'/admin/bao-mat.html',nhom:'HỆ THỐNG'}];
  const $ = id => document.getElementById(id);
  const ngay = iso => new Date(iso).toLocaleDateString('en-GB',{timeZone:'Asia/Ho_Chi_Minh'});
  const homNay = () => new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Ho_Chi_Minh'});
  const VAI = {admin:'Quản trị',bac_si:'Bác sĩ',le_tan:'Lễ tân',thu_ngan:'Thu ngân',kho:'Thủ kho',chu_nuoi:'Chủ nuôi'};
  const baoLoi = m => { const p = $('loi-chung'); p.textContent = m || ''; p.hidden = !m; };
  const rong = t => el('p',{class:'nho',style:'padding:14px 0'}, t);
  const the = (n, v) => el('div',{}, el('div',{class:'n'}, n), el('div',{class:'v'}, v));
  async function boot(href){
    const vt = await Pethy.khu.khoiDong('admin', 'Quản trị', MUC, href);
    return vt;
  }
  // Hộp thoại nhỏ dùng chung: truong là mảng phần tử .truong, hanhDong trả về chuỗi lỗi hoặc null.
  function hop(tieuDe, moTa, truong, nutTen, hanhDong, lamMoi){
    const loi = el('p',{class:'loi',role:'alert',hidden:true});
    const ml = m => { loi.textContent = m || ''; loi.hidden = !m; };
    const d = $('hop');
    $('hop-nd').replaceChildren(el('h2',{style:'margin:0 0 4px;font-size:22px'}, tieuDe),
      moTa ? el('div',{class:'nho',style:'margin-bottom:12px'}, moTa) : el('div',{style:'height:12px'}),
      el('div',{class:'luoi'}, ...truong), loi,
      el('div',{style:'display:flex;gap:16px;justify-content:flex-end;align-items:center;margin-top:20px'},
        el('button',{class:'lien-ket',type:'button',onclick:() => d.close()}, 'Đóng'),
        el('button',{class:'nut chinh',type:'button',onclick:async ev => {
          ml(''); const nutBam = ev.currentTarget; nutBam.disabled = true;
          const e = await hanhDong(); if (e) { nutBam.disabled = false; return ml(e); }
          d.close(); await lamMoi(); }}, nutTen)));
    d.showModal();
  }
  const o = (id, nhan, ...c) => el('div',{class:'truong'}, el('label',{for:id}, nhan), ...c);
  // Luồng "Hoạt động gần đây": mỗi thay đổi dữ liệu của web là một câu dễ đọc (do hàm hoat_dong_gan_day viết, không có nội dung nhạy cảm).
  // Tự làm mới khi bảng nhat_ky đổi (thời gian thực); dòng mới hiện có nền nổi bật vài giây.
  const MUC_HD = { lich:'Lịch hẹn', tien:'Tiền', kho:'Kho', kham:'Khám bệnh', nguoi:'Người dùng', noi_dung:'Nội dung', he_thong:'Hệ thống' };
  const VAI_HD = { admin:'Admin', le_tan:'Lễ tân', bac_si:'Bác sĩ', thu_ngan:'Thu ngân', kho:'Thủ kho', chu_nuoi:'Chủ nuôi' };
  function luongHoatDong(gioiHan, loc){
    const ds = el('div',{class:'hd-luong',role:'log','aria-live':'off'});
    const thoiGian = iso => { const d = new Date(iso), s = (Date.now() - d) / 1000;
      if (s < 60) return 'vừa xong'; if (s < 3600) return Math.floor(s / 60) + ' phút trước';
      return d.toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit',timeZone:'Asia/Ho_Chi_Minh'}) + ' ' + ngay(iso).slice(0, 5); };
    let daThay = null;
    async function tai(){
      const r = await Pethy.db.rpc('hoat_dong_gan_day', { p_gioi_han: gioiHan, p_hanh_dong: loc ? (loc.value || null) : null });
      if (r.error) { ds.replaceChildren(el('p',{class:'loi'}, 'Không tải được hoạt động. Nếu mới cập nhật web, hãy chạy db/15_hoat_dong.sql trong Supabase.')); return; }
      const moi = new Set((r.data || []).map(x => x.id));
      ds.replaceChildren(...((r.data || []).length ? r.data.map(x => el('div',{class:'hang hd-dong' + (daThay && !daThay.has(x.id) ? ' hd-moi' : '')},
        el('div',{class:'hd-gio nho'}, thoiGian(x.thoi_gian)),
        el('div',{class:'hd-noi'}, el('div',{class:'hd-nd'}, x.noi_dung), el('div',{class:'nho'}, x.nguoi + (x.vai_tro ? ' (' + VAI_HD[x.vai_tro] + ')' : ''))),
        el('span',{class:'tt xam'}, MUC_HD[x.muc] || ''))) : [rong('Chưa có hoạt động nào.')]));
      daThay = moi;
    }
    Pethy.khiDoi(['nhat_ky'], tai);
    setInterval(() => { if (!document.hidden) tai(); }, 60_000); // để nhãn "vừa xong" và "n phút trước" không bị cũ
    return { ds, tai };
  }
  return { MUC, $, ngay, homNay, VAI, baoLoi, rong, the, boot, hop, o, luongHoatDong };
})();
