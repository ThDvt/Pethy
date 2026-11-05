// Tạo mã QR (chế độ byte, mức sửa lỗi M, phiên bản 1 đến 10) hoàn toàn trên trình duyệt, không gọi dịch vụ bên ngoài.
// Dùng cho mã chuyển khoản VietQR: số tài khoản và số tiền không rời khỏi máy người dùng.
(function(){
  var ECC = [-1,10,16,26,18,24,16,18,22,22,26,30,22]; // số byte sửa lỗi mỗi khối, mức M
  var KHOI = [-1,1,1,1,2,2,4,4,4,5,5,5,8];            // số khối, mức M
  var MAX = 10; // đã đối chiếu bằng bộ giải mã QR ở các phiên bản 1 đến 10; mã chuyển khoản chỉ cần cỡ 8 đến 9

  function soModuleDuLieu(v){
    var r = (16 * v + 128) * v + 64;
    if (v >= 2) { var n = Math.floor(v / 7) + 2; r -= (25 * n - 10) * n - 55; if (v >= 7) r -= 36; }
    return r;
  }
  var soByteDuLieu = function(v){ return Math.floor(soModuleDuLieu(v) / 8) - ECC[v] * KHOI[v]; };

  function nhan(x, y){ var z = 0; for (var i = 7; i >= 0; i--) { z = (z << 1) ^ ((z >>> 7) * 0x11D); z ^= ((y >>> i) & 1) * x; } return z; }
  function chiaDa(bac){
    var r = []; for (var i = 0; i < bac; i++) r.push(0);
    r[bac - 1] = 1; var goc = 1;
    for (i = 0; i < bac; i++) {
      for (var j = 0; j < bac; j++) { r[j] = nhan(r[j], goc); if (j + 1 < bac) r[j] ^= r[j + 1]; }
      goc = nhan(goc, 2);
    }
    return r;
  }
  function phanDu(du, chia){
    var r = chia.map(function(){ return 0; });
    du.forEach(function(b){ var f = b ^ r.shift(); r.push(0); chia.forEach(function(c, i){ r[i] ^= nhan(c, f); }); });
    return r;
  }
  function utf8(s){
    var o = [], b = unescape(encodeURIComponent(s));
    for (var i = 0; i < b.length; i++) o.push(b.charCodeAt(i));
    return o;
  }

  function tao(chu){
    var byte = utf8(chu), v, bitCount;
    for (v = 1; v <= MAX; v++) {
      bitCount = v < 10 ? 8 : 16;
      if (4 + bitCount + byte.length * 8 <= soByteDuLieu(v) * 8) break;
    }
    if (v > MAX) throw new Error('Nội dung quá dài cho mã QR');
    // chuỗi bit dữ liệu
    var bits = [];
    var them = function(giaTri, n){ for (var i = n - 1; i >= 0; i--) bits.push((giaTri >>> i) & 1); };
    them(4, 4); them(byte.length, bitCount); byte.forEach(function(b){ them(b, 8); });
    var cap = soByteDuLieu(v) * 8;
    them(0, Math.min(4, cap - bits.length));
    while (bits.length % 8) bits.push(0);
    for (var pad = 0xEC; bits.length < cap; pad ^= 0xEC ^ 0x11) them(pad, 8);
    var du = []; for (var i = 0; i < bits.length; i += 8) { var x = 0; for (var k = 0; k < 8; k++) x = (x << 1) | bits[i + k]; du.push(x); }

    // chia khối, thêm byte sửa lỗi, xen kẽ
    var nKhoi = KHOI[v], eccLen = ECC[v], tong = Math.floor(soModuleDuLieu(v) / 8);
    var nNgan = nKhoi - tong % nKhoi, lenNgan = Math.floor(tong / nKhoi), chia = chiaDa(eccLen), khoi = [];
    for (var b = 0, kk = 0; b < nKhoi; b++) {
      var d = du.slice(kk, kk + lenNgan - eccLen + (b < nNgan ? 0 : 1)); kk += d.length;
      var e = phanDu(d, chia); if (b < nNgan) d.push(0); khoi.push(d.concat(e));
    }
    var ma = [];
    for (i = 0; i < khoi[0].length; i++) khoi.forEach(function(kh, j){ if (i !== lenNgan - eccLen || j >= nNgan) ma.push(kh[i]); });

    // khung và vùng chức năng
    var n = v * 4 + 17, mod = [], cn = [];
    for (i = 0; i < n; i++) { mod.push(new Array(n).fill(false)); cn.push(new Array(n).fill(false)); }
    var dat = function(x, y, m){ mod[y][x] = m; cn[y][x] = true; };
    for (i = 0; i < n; i++) { dat(6, i, i % 2 === 0); dat(i, 6, i % 2 === 0); }
    var dauTim = function(x, y){
      for (var dy = -4; dy <= 4; dy++) for (var dx = -4; dx <= 4; dx++) {
        var kc = Math.max(Math.abs(dx), Math.abs(dy)), xx = x + dx, yy = y + dy;
        if (xx >= 0 && xx < n && yy >= 0 && yy < n) dat(xx, yy, kc !== 2 && kc !== 4);
      }
    };
    dauTim(3, 3); dauTim(n - 4, 3); dauTim(3, n - 4);
    var viTri = [];
    if (v > 1) {
      var na = Math.floor(v / 7) + 2, buoc = Math.floor((v * 8 + na * 3 + 5) / (na * 4 - 4)) * 2;
      viTri = [6]; for (var p = n - 7; viTri.length < na; p -= buoc) viTri.splice(1, 0, p);
    }
    viTri.forEach(function(a, ia){ viTri.forEach(function(c, ic){
      if ((ia === 0 && ic === 0) || (ia === 0 && ic === viTri.length - 1) || (ia === viTri.length - 1 && ic === 0)) return;
      for (var dy = -2; dy <= 2; dy++) for (var dx = -2; dx <= 2; dx++) dat(a + dx, c + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    }); });
    var bit = function(x, k){ return ((x >>> k) & 1) !== 0; };
    var dinhDang = function(mask){
      var d = (0 << 3) | mask, r = d; // mức M có mã 0
      for (var q = 0; q < 10; q++) r = (r << 1) ^ ((r >>> 9) * 0x537);
      var bs = ((d << 10) | r) ^ 0x5412, q2;
      for (q2 = 0; q2 <= 5; q2++) dat(8, q2, bit(bs, q2));
      dat(8, 7, bit(bs, 6)); dat(8, 8, bit(bs, 7)); dat(7, 8, bit(bs, 8));
      for (q2 = 9; q2 < 15; q2++) dat(14 - q2, 8, bit(bs, q2));
      for (q2 = 0; q2 < 8; q2++) dat(n - 1 - q2, 8, bit(bs, q2));
      for (q2 = 8; q2 < 15; q2++) dat(8, n - 15 + q2, bit(bs, q2));
      dat(8, n - 8, true);
    };
    dinhDang(0);
    if (v >= 7) {
      var rv = v; for (i = 0; i < 12; i++) rv = (rv << 1) ^ ((rv >>> 11) * 0x1F25);
      var bv = (v << 12) | rv;
      for (i = 0; i < 18; i++) { var a = n - 11 + i % 3, c = Math.floor(i / 3); dat(a, c, bit(bv, i)); dat(c, a, bit(bv, i)); }
    }

    // đặt dữ liệu theo hai cột một, ngoằn ngoèo
    var ib = 0;
    for (var phai = n - 1; phai >= 1; phai -= 2) {
      if (phai === 6) phai = 5;
      for (var doc = 0; doc < n; doc++) for (var j = 0; j < 2; j++) {
        var xc = phai - j, len = ((phai + 1) & 2) === 0, yc = len ? n - 1 - doc : doc;
        if (!cn[yc][xc] && ib < ma.length * 8) { mod[yc][xc] = bit(ma[ib >>> 3], 7 - (ib & 7)); ib++; }
      }
    }

    // chọn mặt nạ có điểm phạt thấp nhất
    var dieuKien = [
      function(x, y){ return (x + y) % 2 === 0; }, function(x, y){ return y % 2 === 0; }, function(x){ return x % 3 === 0; },
      function(x, y){ return (x + y) % 3 === 0; }, function(x, y){ return (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; },
      function(x, y){ return x * y % 2 + x * y % 3 === 0; }, function(x, y){ return (x * y % 2 + x * y % 3) % 2 === 0; },
      function(x, y){ return ((x + y) % 2 + x * y % 3) % 2 === 0; }
    ];
    var ap = function(m){ for (var y = 0; y < n; y++) for (var x = 0; x < n; x++) if (!cn[y][x] && dieuKien[m](x, y)) mod[y][x] = !mod[y][x]; };
    var phat = function(){
      var s = 0, y, x, dem = 0;
      for (var pass = 0; pass < 2; pass++) for (y = 0; y < n; y++) {
        var run = 1;
        for (x = 1; x < n; x++) {
          var cur = pass ? mod[x][y] : mod[y][x], pre = pass ? mod[x - 1][y] : mod[y][x - 1];
          if (cur === pre) { run++; if (run === 5) s += 3; else if (run > 5) s++; } else run = 1;
        }
      }
      for (y = 0; y < n - 1; y++) for (x = 0; x < n - 1; x++) { var c0 = mod[y][x]; if (c0 === mod[y][x + 1] && c0 === mod[y + 1][x] && c0 === mod[y + 1][x + 1]) s += 3; }
      for (y = 0; y < n; y++) for (x = 0; x < n; x++) if (mod[y][x]) dem++;
      var k = Math.ceil(Math.abs(dem * 20 - n * n * 10) / (n * n)) - 1;
      return s + (k > 0 ? k * 10 : 0);
    };
    var tot = 0, diemTot = Infinity;
    for (var m = 0; m < 8; m++) { ap(m); dinhDang(m); var dm = phat(); if (dm < diemTot) { diemTot = dm; tot = m; } ap(m); }
    ap(tot); dinhDang(tot);
    return { n: n, mod: mod, version: v };
  }

  // Ảnh SVG (dựng bằng DOM, không chèn HTML), vùng yên lặng 4 ô theo chuẩn.
  function svg(chu, px){
    var q = tao(chu), NS = 'http://www.w3.org/2000/svg', le = 4, tongO = q.n + le * 2, d = '';
    for (var y = 0; y < q.n; y++) for (var x = 0; x < q.n; x++) if (q.mod[y][x]) d += 'M' + (x + le) + ',' + (y + le) + 'h1v1h-1z';
    var s = document.createElementNS(NS, 'svg');
    s.setAttribute('viewBox', '0 0 ' + tongO + ' ' + tongO); s.setAttribute('width', px || 220); s.setAttribute('height', px || 220);
    s.setAttribute('shape-rendering', 'crispEdges'); s.setAttribute('role', 'img');
    var nen = document.createElementNS(NS, 'rect'); nen.setAttribute('width', tongO); nen.setAttribute('height', tongO); nen.setAttribute('fill', '#fff'); s.appendChild(nen);
    var p = document.createElementNS(NS, 'path'); p.setAttribute('d', d); p.setAttribute('fill', '#000'); s.appendChild(p);
    return s;
  }
  window.PethyQR = { tao: tao, svg: svg };
})();
