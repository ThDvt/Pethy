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
  // Ảnh bìa: cắt khung 16:9 ở giữa ảnh, thu về rộng 1200 px, nén WebP (hoặc JPEG) trước khi tải lên kho 'anh-bai-viet'.
  const KHO = 'anh-bai-viet';
  async function chuanHoaBia(file){
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error('Chỉ nhận ảnh JPG, PNG hoặc WebP.');
    if (file.size > 15 * 1024 * 1024) throw new Error('Ảnh quá lớn (tối đa 15 MB).');
    const bm = await createImageBitmap(file).catch(() => { throw new Error('Không đọc được ảnh này.'); });
    if (bm.width < 600) throw new Error('Ảnh quá nhỏ, nên rộng ít nhất 600 px.');
    const W = Math.min(1200, bm.width), H = Math.round(W * 9 / 16);
    let sw = bm.width, sh = Math.round(bm.width * 9 / 16);
    if (sh > bm.height) { sh = bm.height; sw = Math.round(bm.height * 16 / 9); }
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    cv.getContext('2d').drawImage(bm, (bm.width - sw) / 2, (bm.height - sh) / 2, sw, sh, 0, 0, W, H);
    const blob = await new Promise(ok => cv.toBlob(ok, 'image/webp', 0.82));
    const b = (blob && blob.type === 'image/webp') ? blob : await new Promise(ok => cv.toBlob(ok, 'image/jpeg', 0.85));
    const xem = await new Promise(ok => { const f = new FileReader(); f.onload = () => ok(f.result); f.readAsDataURL(b); });
    return { blob: b, xem, duoi: b.type === 'image/webp' ? 'webp' : 'jpg' };
  }
  const duongBia = url => { const k = '/' + KHO + '/'; const i = url ? url.indexOf(k) : -1; return i < 0 ? null : decodeURIComponent(url.slice(i + k.length).split('?')[0]); };
  // Thẻ bài viết: cả thẻ là một liên kết tới trang bài viết.
  Pethy.baiVietThe = x => el('a',{class:'the-bv',href:'/bai-viet.html?id=' + encodeURIComponent(x.id)},
    x.anh_bia ? el('img',{class:'bv-anh',src:x.anh_bia,alt:'',width:1200,height:675,loading:'lazy',draggable:'false'}) : null,
    el('span',{class:'bv-nhom'}, NHOM[x.nhom] || ''), el('span',{class:'bv-tde'}, x.tieu_de),
    el('span',{class:'bv-tt'}, trich(x)), el('span',{class:'bv-ngay'}, ngay(x.ngay_dang)));
  return { NHOM, ngay, trich, noiDung, TAC_GIA, KHO, chuanHoaBia, duongBia };
})();
