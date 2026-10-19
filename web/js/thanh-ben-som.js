// Dựng thanh bên ngay khi trình duyệt đọc tới đây (trước khi các script khác tải xong),
// dùng thực đơn đã lưu ở trang trước. khu.js sẽ thay bằng bản chính thức sau khi kiểm tra vai trò.
(function(){
  try {
    var c = JSON.parse(sessionStorage.getItem('pethy.menu') || 'null');
    var host = document.getElementById('khung-khu');
    if (!c || !host || !Array.isArray(c.muc)) return;
    var p = location.pathname;
    if (p.indexOf(c.goc) !== 0 && p !== '/trao-doi.html') return;
    var chuan = function(s){ return s.replace(/index\.html$/, '').replace(/\.html$/, '').replace(/\/$/, '') || '/'; };
    var dd = function(tag, cls, text){ var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
    var nav = dd('nav', 'thanh-ben');
    nav.setAttribute('aria-label', 'Khu vực');
    nav.appendChild(dd('div', 'ten', 'Pethy'));
    nav.appendChild(dd('div', 'vai', c.ten));
    c.muc.forEach(function(m){
      var a = dd('a', '', m.ten);
      a.href = m.href;
      if (chuan(m.href) === chuan(p)) a.setAttribute('aria-current', 'page');
      nav.appendChild(a);
    });
    var b = dd('button', 'lien-ket dang-xuat', 'Đăng xuất');
    b.type = 'button';
    b.style.cssText = 'color:#B8BAB4;text-align:left;font-size:15px;padding:10px 0';
    b.onclick = function(){ if (window.Pethy && Pethy.dangXuat) Pethy.dangXuat(); };
    nav.appendChild(b);
    host.insertBefore(nav, host.firstChild);
  } catch (e) {}
})();
