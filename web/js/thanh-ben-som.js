// Thanh bên dùng chung cho khu làm việc (nhân viên và chủ nuôi).
// Dựng ngay khi trình duyệt đọc tới đây (trước khi các script khác tải xong) bằng thực đơn đã lưu ở trang trước,
// để thanh bên không nhấp nháy. khu.js gọi lại PethyThanhBen.dung() với dữ liệu chính thức sau khi kiểm tra vai trò.
(function(){
  var NS = 'http://www.w3.org/2000/svg';
  // Biểu tượng nét 24x24. Mỗi phần tử: [thẻ, thuộc tính].
  var BT = {
    nha:[['path',{d:'M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10'}]],
    bieudo:[['path',{d:'M4 20V10M10 20V4M16 20v-8M22 20H2'}]],
    nguoi:[['circle',{cx:9,cy:8,r:3}],['path',{d:'M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 5a3 3 0 010 6M18 14c2.2.6 3.5 2.6 3.5 5'}]],
    nhan:[['path',{d:'M3 12V4h8l10 10-8 8L3 12z'}],['circle',{cx:7.5,cy:8.5,r:1.2}]],
    lich:[['rect',{x:3,y:5,width:18,height:16,rx:2}],['path',{d:'M3 10h18M8 3v4M16 3v4'}]],
    lichDuyet:[['rect',{x:3,y:5,width:18,height:16,rx:2}],['path',{d:'M3 10h18M8 3v4M16 3v4M9 16l2 2 4-4'}]],
    lichThem:[['rect',{x:3,y:5,width:18,height:16,rx:2}],['path',{d:'M3 10h18M8 3v4M16 3v4M12 13v6M9 16h6'}]],
    thamSo:[['path',{d:'M4 6h10M20 6h-2M4 12h4M20 12h-8M4 18h12M20 18h-2'}],['circle',{cx:16,cy:6,r:2}],['circle',{cx:10,cy:12,r:2}],['circle',{cx:18,cy:18,r:2}]],
    nhatKy:[['path',{d:'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01'}]],
    tinNhan:[['path',{d:'M21 12a8 8 0 01-11.5 7.2L3 21l1.8-5.5A8 8 0 1121 12z'}]],
    khien:[['path',{d:'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3zM9 12l2 2 4-4'}]],
    hop:[['path',{d:'M21 8l-9-5-9 5v8l9 5 9-5V8zM3 8l9 5 9-5M12 13v8'}]],
    the:[['rect',{x:2,y:5,width:20,height:14,rx:2}],['path',{d:'M2 10h20M6 15h4'}]],
    chan:[['circle',{cx:6,cy:11,r:1.8}],['circle',{cx:10,cy:6,r:1.8}],['circle',{cx:14,cy:6,r:1.8}],['circle',{cx:18,cy:11,r:1.8}],['path',{d:'M12 12c-3 0-5 3-5 5 0 2 2 2.5 5 2.5s5-.5 5-2.5c0-2-2-5-5-5z'}]],
    hoaDon:[['path',{d:'M6 3h12v18l-3-2-3 2-3-2-3 2V3zM9 8h6M9 12h6'}]],
    ra:[['path',{d:'M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9'}]],
    sao:[['path',{d:'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3z'}]],
    trai:[['path',{d:'M15 18l-6-6 6-6'}]],
    cham:[['circle',{cx:12,cy:12,r:3}]]
  };
  // Chọn biểu tượng theo đường dẫn, để không phải sửa từng thực đơn.
  var THEO_TRANG = [['doanh-thu','bieudo'],['danh-gia','sao'],['tai-khoan','nguoi'],['dich-vu','nhan'],['lich-lam-viec','lich'],['tham-so','thamSo'],['nhat-ky','nhatKy'],
    ['trao-doi','tinNhan'],['bao-mat','khien'],['khach-hang','nguoi'],['dat-lich','lichThem'],['thu-cung','chan'],['hoa-don','hoaDon']];
  var THEO_KHU = {'/admin':'nha','/le-tan':'lichDuyet','/bac-si':'lichDuyet','/thu-ngan':'the','/kho':'hop','/chu-nuoi':'nha'};
  var chuan = function(s){ return s.replace(/index\.html$/, '').replace(/\.html$/, '').replace(/\/$/, '') || '/'; };
  function chonBt(href){
    for (var i = 0; i < THEO_TRANG.length; i++) if (href.indexOf(THEO_TRANG[i][0]) >= 0) return THEO_TRANG[i][1];
    return THEO_KHU[chuan(href)] || 'cham';
  }
  function svg(ten){
    var s = document.createElementNS(NS, 'svg');
    s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('width', '20'); s.setAttribute('height', '20');
    s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', '1.8');
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

    var hien = chuan(c.hien || location.pathname), nhomCu = null, ds = dd('div', 'tb-muc');
    (c.muc || []).forEach(function(m){
      if (m.nhom && m.nhom !== nhomCu) { nhomCu = m.nhom; ds.appendChild(dd('div', 'tb-nhom', m.nhom)); }
      var a = dd('a', 'tb-m'); a.href = m.href; a.setAttribute('data-ten', m.ten);
      a.appendChild(svg(m.bt || chonBt(m.href))); a.appendChild(dd('span', 'tb-ten', m.ten));
      if (chuan(m.href) === hien) a.setAttribute('aria-current', 'page');
      ds.appendChild(a);
    });
    nav.appendChild(ds);

    var chan = dd('div', 'tb-chan'), ng = dd('div', 'tb-nguoi');
    var ten = c.nguoi || c.ten || '';
    var av = dd('span', 'tb-av', (ten.trim().charAt(0) || '?').toUpperCase()); av.setAttribute('aria-hidden', 'true');
    var tt = dd('div', 'tb-tt'); tt.appendChild(dd('div', 'tb-tn', ten)); tt.appendChild(dd('div', 'tb-vt', c.ten || ''));
    var ra = dd('button', 'tb-ra dang-xuat'); ra.type = 'button'; ra.title = 'Đăng xuất'; ra.setAttribute('aria-label', 'Đăng xuất'); ra.appendChild(svg('ra')); ra.onclick = raKhoi;
    ng.appendChild(av); ng.appendChild(tt); ng.appendChild(ra); chan.appendChild(ng); nav.appendChild(chan);
    return nav;
  }
  window.PethyThanhBen = { dung: dung };

  try {
    var c = JSON.parse(sessionStorage.getItem('pethy.menu') || 'null');
    var host = document.getElementById('khung-khu');
    if (!c || !host || !Array.isArray(c.muc)) return;
    var p = location.pathname;
    if (p.indexOf(c.goc) !== 0 && p !== '/trao-doi.html') return;
    host.insertBefore(dung(c), host.firstChild);
  } catch (e) {}
})();
