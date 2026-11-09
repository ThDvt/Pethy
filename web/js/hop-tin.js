// Thành phần giao diện nhắn tin dùng chung cho trang trao đổi của nhân viên và của quản trị.
(function(){
  const { el } = Pethy, TZ = 'Asia/Ho_Chi_Minh';
  const MAU = ['#C2410C', '#0F766E', '#1D4ED8', '#7C3AED', '#B45309', '#BE185D', '#15803D', '#475569'];
  // Đang ở gần cuối danh sách tin thì tin mới được cuộn tới; người đang đọc tin cũ thì không bị kéo xuống.
  const gancCuoi = v => v.scrollHeight - v.scrollTop - v.clientHeight < 120;
  const ngayKhoa = d => new Date(d).toLocaleDateString('en-CA', { timeZone: TZ });
  const gio = d => new Date(d).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: TZ });
  function nhanNgay(d){
    const k = ngayKhoa(d);
    if (k === ngayKhoa(Date.now())) return 'Hôm nay';
    if (k === ngayKhoa(Date.now() - 864e5)) return 'Hôm qua';
    return new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: TZ });
  }
  // Thời điểm tin cuối trong danh sách: giờ nếu hôm nay, "Hôm qua", còn lại ngày/tháng.
  function nhanGon(d){
    if (!d) return '';
    const k = ngayKhoa(d);
    if (k === ngayKhoa(Date.now())) return gio(d);
    if (k === ngayKhoa(Date.now() - 864e5)) return 'Hôm qua';
    return new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', timeZone: TZ });
  }
  // Ảnh đại diện: có ảnh thật (bác sĩ đã tải ảnh) thì phủ lên chữ cái; ảnh lỗi hoặc không tải được thì còn lại chữ cái.
  function avatar(ten, anh){
    const t = String(ten || '?').trim().split(/\s+/).filter(Boolean);
    const cc = ((t[0] || '?')[0] + (t.length > 1 ? t[t.length - 1][0] : '')).toUpperCase();
    let h = 0; for (const c of String(ten)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    const goc = el('span', { class: 'tn-av', 'aria-hidden': 'true', style: 'background:' + MAU[h % MAU.length] }, cc);
    if (anh) {
      const img = el('img', { class: 'tn-av-anh', src: anh, alt: '', decoding: 'async', referrerpolicy: 'no-referrer' });
      img.addEventListener('error', () => img.remove());
      goc.append(img);
    }
    return goc;
  }
  // Danh sách tin -> các nút DOM: vạch ngày, nhóm tin liền nhau cùng người gửi (trong 5 phút), giờ ở cuối nhóm.
  function dungTin(ds, me, soCu){
    const out = []; let ngayCu = '', truoc = null;
    ds.forEach((t, i) => {
      const k = ngayKhoa(t.created_at), toi = t.nguoi_gui_id === me, sau = ds[i + 1];
      const gan = (a, b) => ngayKhoa(a.created_at) === ngayKhoa(b.created_at) && a.nguoi_gui_id === b.nguoi_gui_id && Math.abs(new Date(b.created_at) - new Date(a.created_at)) < 5 * 60e3;
      if (k !== ngayCu) { out.push(el('div', { class: 'tn-ngay' }, nhanNgay(t.created_at))); ngayCu = k; truoc = null; }
      const dauNhom = !(truoc && gan(truoc, t)), cuoiNhom = !(sau && gan(t, sau));
      out.push(el('div', { class: 'tn-dong ' + (toi ? 'toi' : 'ho') + (dauNhom ? ' moi' : '') + (soCu != null && i >= soCu ? ' den' : '') },
        el('div', { class: 'tn-bong' + (cuoiNhom ? ' cuoi' : '') }, t.noi_dung),
        cuoiNhom ? el('div', { class: 'tn-gio' }, gio(t.created_at)) : null));
      truoc = t;
    });
    return out;
  }
  // Cuộn xuống tin cuối: lần mở đầu tiên nhảy thẳng, tin mới tới thì trượt êm (trừ khi người dùng tắt chuyển động).
  function cuonCuoi(v, em){
    const etm = em && !matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (etm && v.scrollTo) v.scrollTo({ top: v.scrollHeight, behavior: 'smooth' }); else v.scrollTop = v.scrollHeight;
  }
  const BIEU_TUONG = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.714 3.048a.498.498 0 0 0-.683.627l2.843 7.627a2 2 0 0 1 0 1.396l-2.842 7.627a.498.498 0 0 0 .682.627l18-8.5a.5.5 0 0 0 0-.904z"/><path d="M6 12h16"/></svg>';
  // Ô soạn tin: tự cao lên theo nội dung; Enter gửi (máy có chuột), Shift+Enter xuống dòng; trên điện thoại Enter xuống dòng.
  function soanTin(guiDi){
    const o = el('textarea', { rows: '1', placeholder: 'Nhập tin nhắn…', maxlength: '1000', 'aria-label': 'Nội dung tin nhắn' });
    const nut = el('button', { type: 'button', class: 'tn-gui', 'aria-label': 'Gửi' });
    nut.innerHTML = BIEU_TUONG;
    const vua = () => {
      const v = khung.previousElementSibling, cuoi = v && v.classList.contains('tn-tin') && gancCuoi(v);
      o.style.height = 'auto'; o.style.height = Math.min(o.scrollHeight, 140) + 'px';
      o.style.overflowY = o.scrollHeight > 140 ? 'auto' : 'hidden'; // chỉ hiện thanh cuộn khi nội dung vượt chiều cao tối đa
      if (cuoi) v.scrollTop = v.scrollHeight; // ô soạn cao lên thì giữ tin cuối trong tầm nhìn
    };
    const gui = async () => {
      const nd = o.value.trim(); if (!nd || nut.disabled) return;
      nut.disabled = true;
      try { if (await guiDi(nd) !== false) { o.value = ''; vua(); } } finally { nut.disabled = false; }
      if (matchMedia('(pointer:fine)').matches) o.focus();
    };
    o.addEventListener('input', vua);
    o.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && matchMedia('(pointer:fine)').matches) { e.preventDefault(); gui(); } });
    nut.addEventListener('click', gui);
    const khung = el('div', { class: 'tn-soan' }, o, nut);
    return { khung, o, nut };
  }
  // Cho khung chat chiếm hết phần còn lại của màn hình (trừ phần đệm dưới của trang và thanh điều hướng dưới trên điện thoại).
  function phuManHinh(g){
    const f = () => {
      const dem = e => e ? parseFloat(getComputedStyle(e).paddingBottom) || 0 : 0;
      const tren = g.getBoundingClientRect().top + scrollY;
      const h = innerHeight - tren - dem(g.closest('.cot-chinh')) - dem(g.closest('.bo-khu'));
      g.style.height = Math.max(360, Math.floor(h)) + 'px';
    };
    f(); addEventListener('resize', f); addEventListener('orientationchange', f);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(f);
    return f;
  }
  Pethy.hopTin = { gio, nhanGon, avatar, dungTin, soanTin, gancCuoi, cuonCuoi, phuManHinh };
})();
