// Thanh bên dùng chung cho khu làm việc (nhân viên và chủ nuôi).
// Dựng ngay khi trình duyệt đọc tới đây (trước khi các script khác tải xong) bằng thực đơn đã lưu ở trang trước,
// để thanh bên không nhấp nháy. khu.js gọi lại PethyThanhBen.dung() với dữ liệu chính thức sau khi kiểm tra vai trò.
(function(){
  // Trình duyệt chưa có phiên đăng nhập nào: ẩn khung khu làm việc ngay, để khách gõ thẳng /admin/ không thấy bố cục.
  // Người đã đăng nhập (có token) vẫn thấy khung hiện sẵn như cũ.
  try {
    var co = false;
    for (var i = 0; i < localStorage.length; i++) { if (/^sb-.+-auth-token$/.test(localStorage.key(i))) { co = true; break; } }
    if (!co) document.documentElement.classList.add('khong-phien');
  } catch (e) {}
  var NS = 'http://www.w3.org/2000/svg';
  // Biểu tượng nét 24x24 từ bộ Lucide (giấy phép ISC, https://lucide.dev). Mỗi phần tử: [thẻ, thuộc tính].
  var BT = {
    nha:[['path',{'d':'M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8'}],['path',{'d':'M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z'}]],
    bieudo:[['path',{'d':'M3 3v16a2 2 0 0 0 2 2h16'}],['path',{'d':'M18 17V9'}],['path',{'d':'M13 17V5'}],['path',{'d':'M8 17v-3'}]],
    nguoi:[['path',{'d':'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2'}],['path',{'d':'M16 3.128a4 4 0 0 1 0 7.744'}],['path',{'d':'M22 21v-2a4 4 0 0 0-3-3.87'}],['circle',{'cx':'9','cy':'7','r':'4'}]],
    nhan:[['path',{'d':'M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z'}],['circle',{'cx':'7.5','cy':'7.5','r':'.5','fill':'currentColor'}]],
    lich:[['path',{'d':'M8 2v3'}],['path',{'d':'M16 2v3'}],['rect',{'x':'3','y':'3','width':'18','height':'18','rx':'2'}],['path',{'d':'M3 9h18'}],['path',{'d':'M8 13h.01'}],['path',{'d':'M12 13h.01'}],['path',{'d':'M16 13h.01'}],['path',{'d':'M8 17h.01'}],['path',{'d':'M12 17h.01'}],['path',{'d':'M16 17h.01'}]],
    lichDuyet:[['path',{'d':'M8 2v3'}],['path',{'d':'M16 2v3'}],['rect',{'x':'3','y':'3','width':'18','height':'18','rx':'2'}],['path',{'d':'M3 9h18'}],['path',{'d':'m9 15 2 2 4-4'}]],
    lichThem:[['path',{'d':'M16 18h6'}],['path',{'d':'M16 2v3'}],['path',{'d':'M19 15v6'}],['path',{'d':'M21 11.5V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2h8.3'}],['path',{'d':'M3 9h18'}],['path',{'d':'M8 2v3'}]],
    thamSo:[['path',{'d':'M10 5H3'}],['path',{'d':'M12 19H3'}],['path',{'d':'M14 3v4'}],['path',{'d':'M16 17v4'}],['path',{'d':'M21 12h-9'}],['path',{'d':'M21 19h-5'}],['path',{'d':'M21 5h-7'}],['path',{'d':'M8 10v4'}],['path',{'d':'M8 12H3'}]],
    nhatKy:[['path',{'d':'M3 5h.01'}],['path',{'d':'M3 12h.01'}],['path',{'d':'M3 19h.01'}],['path',{'d':'M8 5h13'}],['path',{'d':'M8 12h13'}],['path',{'d':'M8 19h13'}]],
    tinNhan:[['path',{'d':'M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719'}]],
    khien:[['path',{'d':'M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z'}],['path',{'d':'m9 12 2 2 4-4'}]],
    hop:[['path',{'d':'M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z'}],['path',{'d':'M12 22V12'}],['polyline',{'points':'3.29 7 12 12 20.71 7'}],['path',{'d':'m7.5 4.27 9 5.15'}]],
    the:[['rect',{'width':'20','height':'14','x':'2','y':'5','rx':'2'}],['line',{'x1':'2','x2':'22','y1':'10','y2':'10'}],['path',{'d':'M6 14h2'}]],
    chan:[['circle',{'cx':'11','cy':'4','r':'2'}],['circle',{'cx':'18','cy':'8','r':'2'}],['circle',{'cx':'20','cy':'16','r':'2'}],['path',{'d':'M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.045Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10Z'}]],
    hoaDon:[['path',{'d':'M13 16H8'}],['path',{'d':'M14 8H8'}],['path',{'d':'M16 12H8'}],['path',{'d':'M4 3a1 1 0 0 1 1-1 1.3 1.3 0 0 1 .7.2l.933.6a1.3 1.3 0 0 0 1.4 0l.934-.6a1.3 1.3 0 0 1 1.4 0l.933.6a1.3 1.3 0 0 0 1.4 0l.933-.6a1.3 1.3 0 0 1 1.4 0l.934.6a1.3 1.3 0 0 0 1.4 0l.933-.6A1.3 1.3 0 0 1 19 2a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1 1.3 1.3 0 0 1-.7-.2l-.933-.6a1.3 1.3 0 0 0-1.4 0l-.934.6a1.3 1.3 0 0 1-1.4 0l-.933-.6a1.3 1.3 0 0 0-1.4 0l-.933.6a1.3 1.3 0 0 1-1.4 0l-.934-.6a1.3 1.3 0 0 0-1.4 0l-.933.6a1.3 1.3 0 0 1-.7.2 1 1 0 0 1-1-1z'}]],
    ra:[['path',{'d':'m16 17 5-5-5-5'}],['path',{'d':'M21 12H9'}],['path',{'d':'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4'}]],
    menu:[['path',{'d':'M4 5h16'}],['path',{'d':'M4 12h16'}],['path',{'d':'M4 19h16'}]],
    baiViet:[['path',{'d':'M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z'}],['path',{'d':'M14 2v5a1 1 0 0 0 1 1h5'}],['path',{'d':'M10 9H8'}],['path',{'d':'M16 13H8'}],['path',{'d':'M16 17H8'}]],
    sao:[['path',{'d':'M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z'}]],
    trai:[['rect',{'width':'18','height':'18','x':'3','y':'3','rx':'2'}],['path',{'d':'M9 3v18'}]],
    cham:[['circle',{'cx':'12','cy':'12','r':'10'}]]
  };
  // Chọn biểu tượng theo đường dẫn, để không phải sửa từng thực đơn.
  var THEO_TRANG = [['doanh-thu','bieudo'],['danh-gia','sao'],['bai-viet','baiViet'],['tai-khoan','nguoi'],['dich-vu','nhan'],['lich-lam-viec','lich'],['lich-hen','lichDuyet'],['tham-so','thamSo'],['nhat-ky','nhatKy'],
    ['trao-doi','tinNhan'],['bao-mat','khien'],['khach-hang','nguoi'],['ho-so','nguoi'],['dat-lich','lichThem'],['thu-cung','chan'],['hoa-don','hoaDon']];
  var THEO_KHU = {'/admin':'nha','/le-tan':'lichDuyet','/bac-si':'lichDuyet','/thu-ngan':'the','/kho':'hop','/chu-nuoi':'nha'};
  var chuan = function(s){ return s.replace(/index\.html$/, '').replace(/\.html$/, '').replace(/\/$/, '') || '/'; };
  function chonBt(href){
    for (var i = 0; i < THEO_TRANG.length; i++) if (href.indexOf(THEO_TRANG[i][0]) >= 0) return THEO_TRANG[i][1];
    return THEO_KHU[chuan(href)] || 'cham';
  }
  function svg(ten){
    var s = document.createElementNS(NS, 'svg');
    s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('width', '20'); s.setAttribute('height', '20');
    s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', '2');
    s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round'); s.setAttribute('aria-hidden', 'true');
    (BT[ten] || BT.cham).forEach(function(p){ var e = document.createElementNS(NS, p[0]); for (var k in p[1]) e.setAttribute(k, p[1][k]); s.appendChild(e); });
    return s;
  }
  function dd(tag, cls, text){ var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  var doc = function(){ try { return localStorage.getItem('pethy.thu-gon') === '1'; } catch (e) { return false; } };
  var luu = function(v){ try { localStorage.setItem('pethy.thu-gon', v ? '1' : '0'); } catch (e) {} };
  var raKhoi = function(){ if (window.Pethy && Pethy.dangXuat) Pethy.dangXuat(); };

  // c: { goc, ten (tên vai), muc: [{ten, href, nhom?}], hien (đường dẫn đang mở), nguoi (họ tên, có thể trống) }
  function dung(c){
    var nav = dd('nav', 'thanh-ben' + (doc() ? ' gon' : ''));
    nav.setAttribute('aria-label', 'Khu vực');
    var dau = dd('div', 'tb-dau');
    var logo = dd('a', 'tb-logo'); logo.href = c.goc || '/'; logo.setAttribute('aria-label', 'Pethy, về trang đầu của khu');
    var full = dd('img', 'tb-chu'); full.src = '/img/logo-chu.svg'; full.alt = 'Pethy'; full.width = 104; full.height = 54;
    var dauLogo = dd('img', 'tb-dau-logo'); dauLogo.src = '/img/logo.svg'; dauLogo.alt = ''; dauLogo.width = 36; dauLogo.height = 36;
    logo.appendChild(full); logo.appendChild(dauLogo); dau.appendChild(logo);
    var gon = dd('button', 'tb-gon'); gon.type = 'button'; gon.appendChild(svg('trai'));
    var capNhat = function(){ var g = nav.classList.contains('gon'); gon.setAttribute('aria-expanded', String(!g)); gon.setAttribute('aria-label', g ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'); };
    gon.onclick = function(){ nav.classList.toggle('gon'); luu(nav.classList.contains('gon')); capNhat(); };
    capNhat(); dau.appendChild(gon); nav.appendChild(dau);


    var hien = chuan(c.hien || location.pathname), nhomCu = null, ds = dd('div', 'tb-muc'); ds.id = 'tb-danh-sach';
    (c.muc || []).forEach(function(m){
      if (m.nhom && m.nhom !== nhomCu) { nhomCu = m.nhom; ds.appendChild(dd('div', 'tb-nhom', m.nhom)); }
      var a = dd('a', 'tb-m'); a.href = m.href; a.setAttribute('data-ten', m.ten);
      a.appendChild(svg(m.bt || chonBt(m.href))); a.appendChild(dd('span', 'tb-ten', m.ten));
      if (chuan(m.href) === hien) { a.setAttribute('aria-current', 'page'); }
      ds.appendChild(a);
    });
    var tam = dd('div', 'tb-tam'); tam.id = 'tb-tam'; tam.appendChild(ds);   // máy tính: không có khung riêng; điện thoại: bảng mở lên từ thanh viên thuốc

    var chan = dd('div', 'tb-chan'), ng = dd('div', 'tb-nguoi');
    var ten = c.nguoi || c.ten || '';
    var av = dd('span', 'tb-av', (ten.trim().charAt(0) || '?').toUpperCase()); av.setAttribute('aria-hidden', 'true');
    var tt = dd('div', 'tb-tt'); tt.appendChild(dd('div', 'tb-tn', ten)); tt.appendChild(dd('div', 'tb-vt', c.ten || ''));
    var ra = dd('button', 'tb-ra dang-xuat'); ra.type = 'button'; ra.title = 'Đăng xuất'; ra.setAttribute('aria-label', 'Đăng xuất'); ra.appendChild(svg('ra')); ra.appendChild(dd('span', 'tb-ra-ch', 'Đăng xuất')); ra.onclick = raKhoi;
    ng.appendChild(av); ng.appendChild(tt); ng.appendChild(ra); chan.appendChild(ng); tam.appendChild(chan); nav.appendChild(tam);

    // Điện thoại: thanh dạng viên thuốc nổi ở đáy màn hình, chỉ có biểu tượng (tối đa 4 mục + nút "Thêm" mở danh sách đầy đủ có chữ và Đăng xuất).
    var muc = c.muc || [], chon = muc.slice(0, 4), iHien = -1;
    muc.forEach(function(m, i){ if (chuan(m.href) === hien) iHien = i; });
    if (muc.length > 4 && iHien > 3) chon[3] = muc[iHien];
    var vien = dd('div', 'tb-vien'); vien.setAttribute('role', 'group'); vien.setAttribute('aria-label', 'Chuyển trang nhanh');
    chon.forEach(function(m){
      var v = dd('a', 'tb-v'); v.href = m.href; v.setAttribute('data-ten', m.ten); v.setAttribute('aria-label', m.ten); v.title = m.ten;
      v.appendChild(svg(m.bt || chonBt(m.href)));
      if (chuan(m.href) === hien) v.setAttribute('aria-current', 'page');
      vien.appendChild(v);
    });
    var them = dd('button', 'tb-v tb-them'); them.type = 'button'; them.setAttribute('aria-label', 'Thêm mục và tài khoản'); them.title = 'Thêm';
    them.setAttribute('aria-expanded', 'false'); them.setAttribute('aria-controls', 'tb-tam'); them.appendChild(svg('menu'));
    var dongMo = function(){ nav.classList.remove('mo-menu'); them.setAttribute('aria-expanded', 'false'); };
    them.onclick = function(){ var m = nav.classList.toggle('mo-menu'); them.setAttribute('aria-expanded', String(m)); };
    document.addEventListener('keydown', function(e){ if (e.key === 'Escape' && nav.classList.contains('mo-menu')) { dongMo(); them.focus(); } });
    document.addEventListener('click', function(e){ if (nav.classList.contains('mo-menu') && !nav.contains(e.target)) dongMo(); });
    vien.appendChild(them); nav.appendChild(vien);
    // Tài khoản ít mục (không phải quản trị): điện thoại hiện thanh viên thuốc nổi, chỉ có biểu tượng, thay cho nút tròn mở bảng.
    if (muc.length <= 4) {
      nav.classList.add('thanh-noi');
      var rv = dd('button', 'tb-v tb-ra-v'); rv.type = 'button'; rv.title = 'Đăng xuất'; rv.setAttribute('aria-label', 'Đăng xuất');
      rv.appendChild(svg('ra')); rv.onclick = raKhoi; vien.insertBefore(rv, them);
    }
    // Có mục nào có số mới thì nút menu hiện chấm đỏ, để không bỏ sót.
    nav.capNhatCham = function(){
      var co = false, mm = tam.querySelectorAll('.tb-m');
      for (var i = 0; i < mm.length; i++) { if (mm[i].querySelector('.tb-so')) co = true; }
      var cu = them.querySelector('.tb-cham'); if (cu) cu.remove();
      if (co) { var d = dd('span', 'tb-cham'); d.setAttribute('aria-hidden', 'true'); them.appendChild(d); }
    };
    return nav;
  }
  // Đặt số nhỏ (huy hiệu) ở mục thực đơn có đường dẫn href; n = 0 thì bỏ huy hiệu.
  function datSo(href, n){
    var muc = document.querySelectorAll('.thanh-ben .tb-m, .thanh-ben .tb-v[href]');
    for (var i = 0; i < muc.length; i++) {
      var a = muc[i];
      if (chuan(a.getAttribute('href') || '') !== chuan(href)) continue;
      var cu = a.querySelector('.tb-so'); if (cu) cu.remove();
      var ten = a.getAttribute('data-ten') || '';
      if (n > 0) {
        var s = dd('span', 'tb-so', n > 9 ? '9+' : String(n)); s.setAttribute('aria-hidden', 'true'); a.appendChild(s);
        a.setAttribute('aria-label', ten + ', ' + n + ' mục mới');
      } else if (a.classList.contains('tb-v')) a.setAttribute('aria-label', ten); else a.removeAttribute('aria-label');
    }
    var nv = document.querySelector('.thanh-ben'); if (nv && nv.capNhatCham) nv.capNhatCham();
  }
  window.PethyThanhBen = { dung: dung, datSo: datSo };

  try {
    var c = JSON.parse(sessionStorage.getItem('pethy.menu') || 'null');
    var host = document.getElementById('khung-khu');
    if (!c || !host || !Array.isArray(c.muc)) return;
    var p = location.pathname;
    if (p.indexOf(c.goc) !== 0 && p !== '/trao-doi.html') return;
    host.insertBefore(dung(c), host.firstChild);
  } catch (e) {}
})();
