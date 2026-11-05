// Mã VietQR để khách chuyển khoản đúng số tiền và nội dung. Mã dựng hoàn toàn trên trình duyệt (ma-qr.js), không gọi dịch vụ ngoài.
// Thông tin tài khoản do admin nhập ở trang Tham số và chỉ trả về cho thu ngân, chủ nuôi, admin (hàm thong_tin_chuyen_khoan).
(function(){
  const { el, tien } = Pethy;
  const tlv = (id, v) => id + String(v.length).padStart(2, '0') + v;
  // CRC-16/CCITT-FALSE theo chuẩn EMV QR: đa thức 0x1021, khởi tạo 0xFFFF.
  function crc16(s){
    let c = 0xFFFF;
    for (let i = 0; i < s.length; i++) { c ^= s.charCodeAt(i) << 8; for (let k = 0; k < 8; k++) c = (c & 0x8000) ? ((c << 1) ^ 0x1021) & 0xFFFF : (c << 1) & 0xFFFF; }
    return c.toString(16).toUpperCase().padStart(4, '0');
  }
  // Nội dung chỉ gồm chữ không dấu, số, dấu cách, tối đa 25 ký tự (giới hạn thông dụng của ngân hàng).
  const sachNd = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').replace(/[^A-Za-z0-9 ]/g, '').trim().slice(0, 25);
  function vietqr(bin, stk, soTien, noiDung){
    const nd = sachNd(noiDung);
    const s = tlv('00', '01') + tlv('01', '12')
      + tlv('38', tlv('00', 'A000000727') + tlv('01', tlv('00', bin) + tlv('01', stk)) + tlv('02', 'QRIBFTTA'))
      + tlv('53', '704') + tlv('54', String(soTien)) + tlv('58', 'VN') + (nd ? tlv('62', tlv('08', nd)) : '') + '6304';
    return s + crc16(s);
  }
  let cache = null;
  const layThongTin = () => cache || (cache = Pethy.db.rpc('thong_tin_chuyen_khoan').then(r => r.error ? null : r.data, () => null));

  // Trả về { nut, vung } để chèn vào trang, hoặc null nếu chưa cấu hình tài khoản (khi đó không hiện gì).
  // layTien(): số tiền hiện tại cần chuyển; oNhap (tùy chọn): ô nhập số tiền, đổi số thì mã tự làm mới.
  async function khung(hoaDonId, layTien, oNhap){
    const tt = await layThongTin();
    if (!tt) return null;
    const vung = el('div', { class: 'ck-vung', hidden: true, 'aria-live': 'polite' });
    const nut = el('button', { type: 'button', class: 'lien-ket', 'aria-expanded': 'false' }, 'Hiện mã QR chuyển khoản');
    const nd = 'PETHY ' + String(hoaDonId).replace(/-/g, '').slice(0, 8).toUpperCase();
    const ve = () => {
      const st = layTien();
      if (!Number.isInteger(st) || st <= 0) return vung.replaceChildren(el('p', { class: 'nho', style: 'margin:0' }, 'Nhập số tiền lớn hơn 0 để tạo mã.'));
      vung.replaceChildren(PethyQR.svg(vietqr(tt.bin, tt.so_tai_khoan, st, nd), 200),
        el('div', { class: 'ck-ct' },
          el('div', { class: 'nho' }, 'Quét bằng ứng dụng ngân hàng'),
          el('div', { class: 'ck-dong' }, el('span', {}, 'Số tiền'), el('b', { class: 'so' }, tien(st))),
          el('div', { class: 'ck-dong' }, el('span', {}, 'Số tài khoản'), el('b', { class: 'so' }, tt.so_tai_khoan)),
          el('div', { class: 'ck-dong' }, el('span', {}, 'Chủ tài khoản'), el('b', {}, tt.ten)),
          el('div', { class: 'ck-dong' }, el('span', {}, 'Nội dung'), el('b', { class: 'so' }, nd))));
    };
    nut.addEventListener('click', () => {
      const mo = vung.hidden; vung.hidden = !mo; nut.setAttribute('aria-expanded', String(mo));
      nut.textContent = mo ? 'Ẩn mã QR' : 'Hiện mã QR chuyển khoản';
      if (mo) ve();
    });
    if (oNhap) oNhap.addEventListener('input', () => { if (!vung.hidden) ve(); });
    return { nut, vung };
  }
  Pethy.chuyenKhoan = { khung, vietqr, crc16 };
})();
