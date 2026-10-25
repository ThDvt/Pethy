// Khung chung cho khu quản trị.
Pethy.admin = (function(){
  const { el } = Pethy;
  const MUC = [
    {ten:'Tổng quan',href:'/admin/',nhom:'CHÍNH'},{ten:'Doanh thu',href:'/admin/doanh-thu.html',nhom:'CHÍNH'},
    {ten:'Tài khoản',href:'/admin/tai-khoan.html',nhom:'QUẢN LÝ'},{ten:'Dịch vụ',href:'/admin/dich-vu.html',nhom:'QUẢN LÝ'},{ten:'Lịch làm',href:'/admin/lich-lam-viec.html',nhom:'QUẢN LÝ'},{ten:'Tham số',href:'/admin/tham-so.html',nhom:'QUẢN LÝ'},
    {ten:'Đánh giá',href:'/admin/danh-gia.html',nhom:'QUẢN LÝ'},
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
  return { MUC, $, ngay, homNay, VAI, baoLoi, rong, the, boot, hop, o };
})();
