// Phần dùng chung cho bài viết: nhóm, ngày, đoạn trích và vẽ nội dung.
// Nội dung là văn bản thuần. Chỉ hiểu hai dấu hiệu: dòng "## " là tiêu đề nhỏ, dòng "- " là mục danh sách.
// Mọi thứ được dựng bằng DOM (textContent), không dùng innerHTML nên không chèn được mã.
Pethy.baiViet = (function(){
  const { el } = Pethy;
  const NHOM = { cham_soc:'Chăm sóc', tiem_phong:'Tiêm phòng', benh:'Bệnh thường gặp', phong_kham:'Thông báo phòng khám' };
  const ngay = iso => iso ? new Date(iso).toLocaleDateString('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric',timeZone:'Asia/Ho_Chi_Minh'}) : '';
  const TAC_GIA = 'Phòng khám Pethy';
  function trich(x, n = 150){
    if (x.tom_tat) return x.tom_tat;
    const t = String(x.noi_dung || '').replace(/^(##\s+|-\s+)/gm, '').replace(/\s+/g, ' ').trim();
    return t.length > n ? t.slice(0, n).replace(/\s+\S*$/, '') + '…' : t;
  }
  function noiDung(text){
    const ra = []; let ds = null, doan = [];
    const xaDoan = () => { if (doan.length) { ra.push(el('p',{}, doan.join(' '))); doan = []; } };
    const xaDs = () => { if (ds) { ra.push(ds); ds = null; } };
    String(text || '').replace(/\r/g, '').split('\n').forEach(d => {
      const s = d.trim();
      if (!s) { xaDoan(); xaDs(); return; }
      if (/^##\s+/.test(s)) { xaDoan(); xaDs(); ra.push(el('h2',{}, s.replace(/^##\s+/, ''))); return; }
      if (/^-\s+/.test(s)) { xaDoan(); if (!ds) ds = el('ul',{}); ds.append(el('li',{}, s.replace(/^-\s+/, ''))); return; }
      xaDs(); doan.push(s);
    });
    xaDoan(); xaDs();
    return ra;
  }
  // Thẻ bài viết: cả thẻ là một liên kết tới trang bài viết.
  Pethy.baiVietThe = x => el('a',{class:'the-bv',href:'/bai-viet.html?id=' + encodeURIComponent(x.id)},
    el('span',{class:'bv-nhom'}, NHOM[x.nhom] || ''), el('span',{class:'bv-tde'}, x.tieu_de),
    el('span',{class:'bv-tt'}, trich(x)), el('span',{class:'bv-ngay'}, ngay(x.ngay_dang)));
  return { NHOM, ngay, trich, noiDung, TAC_GIA };
})();
