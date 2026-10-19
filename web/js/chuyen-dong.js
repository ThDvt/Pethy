// Chuyển động dùng chung: thanh tiến trình khi chuyển trang, vòng xoay trên nút đang xử lý, hiện dần khi cuộn.
(function(){
  var de = document.documentElement;
  de.classList.add('co-js');
  var giam = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Thanh tiến trình đầu trang: bấm liên kết nội bộ là có phản hồi ngay.
  function bar(){
    if (document.querySelector('.tien-do')) return;
    var d = document.createElement('div'); d.className = 'tien-do'; document.body.appendChild(d);
  }
  document.addEventListener('click', function(ev){
    if (ev.defaultPrevented || ev.button !== 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
    var a = ev.target.closest && ev.target.closest('a[href]');
    if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
    var u; try { u = new URL(a.href, location.href); } catch (e) { return; }
    if (u.origin !== location.origin) return;
    if (u.pathname === location.pathname && u.search === location.search) return;
    bar();
  });
  window.addEventListener('pageshow', function(ev){
    if (ev.persisted) { var b = document.querySelector('.tien-do'); if (b) b.remove(); }
  });

  // Nút vừa bấm mà bị khóa (đang gửi) thì hiện vòng xoay cho tới khi mở khóa.
  document.addEventListener('click', function(ev){
    var n = ev.target.closest && ev.target.closest('.nut');
    if (n) n.dataset.vuaBam = String(Date.now());
  }, true);
  new MutationObserver(function(ds){
    ds.forEach(function(m){
      var n = m.target;
      if (!(n.classList && n.classList.contains('nut'))) return;
      if (n.hasAttribute('disabled')) {
        if (Date.now() - Number(n.dataset.vuaBam || 0) < 8000) n.classList.add('dang-xu-ly');
      } else n.classList.remove('dang-xu-ly');
    });
  }).observe(document, { subtree: true, attributes: true, attributeFilter: ['disabled'] });

  // Trang chủ: các mục hiện dần khi cuộn tới.
  document.addEventListener('DOMContentLoaded', function(){
    if (giam || !('IntersectionObserver' in window)) return;
    var ds = document.querySelectorAll('.muc-lon > .khung');
    if (!ds.length) return;
    var io = new IntersectionObserver(function(es){
      es.forEach(function(e){ if (e.isIntersecting) { e.target.classList.add('da-hien'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    ds.forEach(function(e){ e.classList.add('hien-cuon'); io.observe(e); });
  });
})();
