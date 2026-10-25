// Dashboard kinh tế của phòng khám. Số liệu "đã thu" lấy từ thanh_toan; "doanh số" lấy từ hóa đơn đã lập chưa hủy.
(async function(){
  const { db, el, tien } = Pethy, A = Pethy.admin, $ = A.$;
  if (!await A.boot('/admin/')) return;
  const SVGNS = 'http://www.w3.org/2000/svg';
  const sv = (tag, attrs, ...con) => { const e = document.createElementNS(SVGNS, tag); for (const k in (attrs || {})) e.setAttribute(k, attrs[k]); con.forEach(c => c != null && e.append(c.nodeType ? c : document.createTextNode(String(c)))); return e; };
  const MAU = { chinh:'var(--s1)', phu:'var(--s2)', thu3:'var(--s3)' };
  const hn = A.homNay();
  // ---- ngày tháng (chuỗi YYYY-MM-DD, tính theo UTC để không lệch múi giờ) ----
  const toD = s => new Date(s + 'T00:00:00Z'), toS = d => d.toISOString().slice(0, 10);
  const cong = (s, n) => toS(new Date(toD(s).getTime() + n * 864e5));
  const soNgay = (a, b) => Math.round((toD(b) - toD(a)) / 864e5) + 1;
  const dm = s => s.slice(8) + '/' + s.slice(5, 7);
  const TRUOC = [{ k:'7', ten:'7 ngày', n:7 }, { k:'30', ten:'30 ngày', n:30 }, { k:'thang', ten:'Tháng này' }, { k:'90', ten:'3 tháng', n:90 }, { k:'365', ten:'12 tháng', n:365 }];
  let ky = '30';
  function khoang(k){
    const t = TRUOC.find(x => x.k === k), den = hn;
    const tu = t.n ? cong(den, -(t.n - 1)) : hn.slice(0, 8) + '01';
    const len = soNgay(tu, den), pDen = cong(tu, -1), pTu = cong(pDen, -(len - 1));
    return { tu, den, len, pTu, pDen };
  }
  // ---- định dạng số ----
  const gon = v => { v = Number(v); const a = Math.abs(v);
    if (a >= 1e9) return (v / 1e9).toFixed(1).replace('.0', '').replace('.', ',') + ' tỷ';
    if (a >= 1e6) return (v / 1e6).toFixed(1).replace('.0', '').replace('.', ',') + ' tr';
    if (a >= 1e3) return Math.round(v / 1e3) + 'k'; return String(Math.round(v)); };
  const phanTram = x => (Math.round(x * 10) / 10).toString().replace('.', ',') + '%';
  function dep(max){ // trần trục tung "đẹp" và 4 vạch chia
    if (max <= 0) return { top: 1, step: 0.25 };
    const e = Math.pow(10, Math.floor(Math.log10(max))), f = max / e;
    const m = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10; return { top: m * e, step: m * e / 4 };
  }
  // ---- tooltip dùng chung ----
  const tip = el('div',{class:'dg-tip',role:'status',hidden:true}); document.body.append(tip);
  function hienTip(ev, dong){ tip.replaceChildren(...dong); tip.hidden = false;
    const r = tip.getBoundingClientRect(); let x = ev.clientX + 14, y = ev.clientY - r.height - 10;
    if (x + r.width > innerWidth - 8) x = ev.clientX - r.width - 14; if (y < 8) y = ev.clientY + 16;
    tip.style.left = x + 'px'; tip.style.top = y + 'px'; }
  const anTip = () => { tip.hidden = true; };
  // ---- biểu đồ cột theo thời gian ----
  function bieuDoCot(rows){
    const W = 720, H = 250, L = 46, R = 8, T = 12, B = 28, pw = W - L - R, ph = H - T - B;
    const max = Math.max(0, ...rows.map(r => r.tong)), { top, step } = dep(max);
    const slot = pw / rows.length, bw = Math.min(24, Math.max(3, slot * 0.7));
    const y = v => T + ph - (v / top) * ph;
    const g = sv('svg', { viewBox:'0 0 ' + W + ' ' + H, class:'bd', role:'img', 'aria-label':'Biểu đồ cột doanh thu đã thu theo ' + (rows[0] && rows[0].thang ? 'tháng' : 'ngày') });
    for (let i = 0; i <= 4; i++) { const v = step * i, yy = y(v);
      g.append(sv('line', { x1:L, x2:W - R, y1:yy, y2:yy, class:'luoi-ngang' }), sv('text', { x:L - 8, y:yy + 4, 'text-anchor':'end', class:'truc' }, gon(v))); }
    const moi = Math.max(1, Math.ceil(rows.length / 8));
    rows.forEach((r, i) => {
      const cx = L + slot * (i + 0.5), h = Math.max(0, ph - (y(r.tong) - T)), top0 = y(r.tong);
      const bar = sv('path', { class:'cot', d: h <= 0 ? '' : 'M' + (cx - bw / 2) + ',' + (T + ph) + 'V' + (top0 + Math.min(4, h)) + 'q0,-' + Math.min(4, h) + ' ' + Math.min(4, bw / 2) + ',-' + Math.min(4, h) + 'h' + (bw - 2 * Math.min(4, bw / 2)) + 'q' + Math.min(4, bw / 2) + ',0 ' + Math.min(4, bw / 2) + ',' + Math.min(4, h) + 'V' + (T + ph) + 'Z' });
      const hit = sv('rect', { x:L + slot * i, y:T, width:slot, height:ph, fill:'transparent', tabindex:'0', class:'hit', 'aria-label': r.nhan + ': ' + tien(r.tong) });
      const bat = ev => { bar.classList.add('nang'); hienTip(ev, [el('div',{class:'dg-nhan'}, r.nhan), el('div',{class:'dg-gt'}, tien(r.tong)), el('div',{class:'dg-ph'}, 'Tiền mặt ' + tien(r.tien_mat)), el('div',{class:'dg-ph'}, 'Chuyển khoản ' + tien(r.chuyen_khoan)), el('div',{class:'dg-ph'}, r.so + ' lần thu')]); };
      hit.addEventListener('pointermove', bat); hit.addEventListener('pointerleave', () => { bar.classList.remove('nang'); anTip(); });
      hit.addEventListener('focus', () => { const b = hit.getBoundingClientRect(); bat({ clientX:b.left + b.width / 2, clientY:b.top + 30 }); }); hit.addEventListener('blur', () => { bar.classList.remove('nang'); anTip(); });
      g.append(bar, hit);
      if (i % moi === 0) g.append(sv('text', { x:cx, y:H - 8, 'text-anchor':'middle', class:'truc' }, r.nhanNgan));
    });
    return g;
  }
  // ---- bánh rán (cơ cấu của một tổng) kèm chú giải; chỉ dùng cho 2 đến 3 phần ----
  function banhRan(phan, donVi){
    const tong = phan.reduce((s, p) => s + p.v, 0);
    if (!tong) return el('p',{class:'nho',style:'padding:12px 0'}, 'Chưa có số liệu trong kỳ này.');
    const R = 52, C = 2 * Math.PI * R, SZ = 150, co = phan.filter(p => p.v > 0), khe = co.length > 1 ? 3 : 0;
    const g = sv('svg', { viewBox:'0 0 ' + SZ + ' ' + SZ, class:'bran', role:'img', 'aria-label':phan.map(p => p.ten + ' ' + phanTram(p.v / tong * 100)).join(', ') });
    g.append(sv('circle', { cx:SZ / 2, cy:SZ / 2, r:R, fill:'none', stroke:'var(--vach)', 'stroke-width':22, opacity:'.5' }));
    let dau = 0;
    co.forEach(p => {
      const dai = p.v / tong * C, ve = Math.max(1, dai - khe);
      const arc = sv('circle', { cx:SZ / 2, cy:SZ / 2, r:R, fill:'none', stroke:p.mau, 'stroke-width':22, 'stroke-dasharray':ve + ' ' + (C - ve), 'stroke-dashoffset':-(dau + khe / 2), transform:'rotate(-90 ' + SZ / 2 + ' ' + SZ / 2 + ')', class:'lat', tabindex:'0', 'aria-label':p.ten + ': ' + tien(p.v) + ', ' + phanTram(p.v / tong * 100) });
      const bat = ev => hienTip(ev, [el('div',{class:'dg-nhan'}, p.ten), el('div',{class:'dg-gt'}, tien(p.v)), el('div',{class:'dg-ph'}, phanTram(p.v / tong * 100) + ' ' + donVi)]);
      arc.addEventListener('pointermove', bat); arc.addEventListener('pointerleave', anTip);
      arc.addEventListener('focus', () => { const b = arc.getBoundingClientRect(); bat({ clientX:b.left + b.width / 2, clientY:b.top }); }); arc.addEventListener('blur', anTip);
      g.append(arc); dau += dai;
    });
    g.append(sv('text', { x:SZ / 2, y:SZ / 2 + 2, 'text-anchor':'middle', class:'bran-so' }, gon(tong)), sv('text', { x:SZ / 2, y:SZ / 2 + 20, 'text-anchor':'middle', class:'bran-nhan' }, 'tổng'));
    return el('div',{class:'db-bran'}, g, el('div',{class:'chu-giai'}, ...phan.map(p => el('div',{},
      el('i',{class:'nut-mau',style:'background:' + p.mau}), el('span',{class:'cg-ten'}, p.ten), el('b',{}, tien(p.v)), el('span',{class:'nho'}, ' ' + phanTram(p.v / tong * 100))))));
  }
  // ---- cột ngang xếp hạng ----
  function xepHang(ds){
    const max = Math.max(1, ...ds.map(d => d.v));
    return el('div',{class:'xh'}, ...ds.map(d => el('div',{class:'xh-hang'},
      el('div',{class:'xh-ten'}, d.ten, el('span',{class:'nho'}, ' ' + d.phu)),
      el('div',{class:'xh-thanh'}, el('div',{class:'xh-do',style:'width:' + Math.max(2, d.v / max * 100) + '%'})),
      el('div',{class:'xh-gt'}, tien(d.v)))));
  }
  // ---- dữ liệu ----
  const khung = el('div',{id:'db-khung'});
  const loc = el('div',{class:'db-loc',role:'group','aria-label':'Khoảng thời gian'});
  const gl = k => { ky = k; ve(); };
  function veLoc(){ loc.replaceChildren(...TRUOC.map(t => el('button',{type:'button',class:'db-nut','aria-pressed':String(t.k === ky),onclick:() => gl(t.k)}, t.ten))); }
  $('vung').replaceChildren(loc, khung);
  const gop = rows => ({ tong: rows.reduce((s, r) => s + Number(r.tong_thu), 0), so: rows.reduce((s, r) => s + Number(r.so_giao_dich), 0), tm: rows.reduce((s, r) => s + Number(r.tien_mat), 0), ck: rows.reduce((s, r) => s + Number(r.chuyen_khoan), 0) });
  const dem = async (tt, tu, den) => { const r = await db.from('lich_hen').select('id,trang_thai', { count:'exact', head:true }).eq('trang_thai', tt).gte('thoi_gian', new Date(tu + 'T00:00:00+07:00').toISOString()).lt('thoi_gian', new Date(cong(den, 1) + 'T00:00:00+07:00').toISOString());
    return r.count != null ? r.count : (r.data || []).filter(x => x.trang_thai === tt).length; };
  let lanVe = 0;
  async function ve(){
    const lan = ++lanVe; A.baoLoi(''); veLoc(); khung.style.opacity = '.5';
    const k = khoang(ky);
    const [cur, pre, dv, cn, cb, hoanThanh, huy, khongDen] = await Promise.all([
      db.rpc('doanh_thu_theo_ngay', { p_tu:k.tu, p_den:k.den }), db.rpc('doanh_thu_theo_ngay', { p_tu:k.pTu, p_den:k.pDen }),
      db.rpc('doanh_thu_theo_dich_vu', { p_tu:k.tu, p_den:k.den }),
      db.from('cong_no_hoa_don').select('hoa_don_id,created_at,ten_chu_nuoi,so_dien_thoai,tong_tien,da_thu,con_no').order('created_at'),
      db.from('canh_bao_kho').select('loai_canh_bao,ten,so_lo,han_dung,ton'),
      dem('da_hoan_thanh', k.tu, k.den), dem('da_huy', k.tu, k.den), dem('khong_den', k.tu, k.den)]);
    if (lan !== lanVe) return;   // người dùng đã bấm khoảng khác trong lúc chờ
    khung.style.opacity = '';
    if (cur.error || pre.error || dv.error || cn.error) return A.baoLoi('Không tải được số liệu. Vui lòng tải lại trang.');
    const c = gop(cur.data || []), p = gop(pre.data || []);
    // gom theo ngày (đủ mọi ngày, ngày không thu = 0) hoặc theo tháng nếu kỳ dài
    const theoNgay = Object.fromEntries((cur.data || []).map(r => [String(r.ngay).slice(0, 10), r]));
    let rows = [];
    if (k.len > 92) {
      const m = {}; (cur.data || []).forEach(r => { const key = String(r.ngay).slice(0, 7); const o = m[key] = m[key] || { tong:0, tien_mat:0, chuyen_khoan:0, so:0 }; o.tong += Number(r.tong_thu); o.tien_mat += Number(r.tien_mat); o.chuyen_khoan += Number(r.chuyen_khoan); o.so += Number(r.so_giao_dich); });
      for (let d = k.tu.slice(0, 7); d <= k.den.slice(0, 7); d = toS(new Date(Date.UTC(+d.slice(0, 4), +d.slice(5, 7), 1))).slice(0, 7)) { const o = m[d] || { tong:0, tien_mat:0, chuyen_khoan:0, so:0 }; rows.push({ ...o, thang:true, nhan:'Tháng ' + d.slice(5) + '/' + d.slice(0, 4), nhanNgan:d.slice(5) + '/' + d.slice(2, 4) }); }
    } else {
      for (let i = 0; i < k.len; i++) { const d = cong(k.tu, i), r = theoNgay[d]; rows.push({ tong:r ? Number(r.tong_thu) : 0, tien_mat:r ? Number(r.tien_mat) : 0, chuyen_khoan:r ? Number(r.chuyen_khoan) : 0, so:r ? Number(r.so_giao_dich) : 0, nhan:dm(d) + '/' + d.slice(0, 4), nhanNgan:dm(d) }); }
    }
    const nhom = {}; (dv.data || []).forEach(x => { nhom[x.nhom] = (nhom[x.nhom] || 0) + Number(x.tong_tien); });
    const top = (dv.data || []).map(x => ({ ten:x.ten, phu:x.nhom, v:Number(x.tong_tien) })).sort((a, b) => b.v - a.v).slice(0, 6);
    const tongNo = (cn.data || []).reduce((s, x) => s + x.con_no, 0), tongLich = hoanThanh + huy + khongDen;
    const dtb = c.so ? Math.round(c.tong / c.so) : 0;
    const delta = p.tong > 0 ? (c.tong - p.tong) / p.tong * 100 : null;
    const dd = delta == null ? el('div',{class:'db-delta'}, p.tong === 0 && c.tong === 0 ? 'Chưa có khoản thu trong kỳ này và kỳ trước.' : 'Kỳ trước chưa có khoản thu để so sánh.')
      : el('div',{class:'db-delta ' + (delta >= 0 ? 'tang' : 'giam')}, el('b',{}, (delta >= 0 ? '▲ Tăng ' : '▼ Giảm ') + phanTram(Math.abs(delta))), ' so với kỳ trước (' + tien(p.tong) + ', ' + dm(k.pTu) + ' đến ' + dm(k.pDen) + ')');
    const CB = {sap_het:'Sắp hết hàng',sap_het_han:'Lô sắp hết hạn',het_han:'Lô hết hạn còn tồn'};
    const bang = el('table',{class:'db-bang'}, el('thead',{}, el('tr',{}, ...['Thời gian','Đã thu','Tiền mặt','Chuyển khoản','Số lần thu'].map(t => el('th',{scope:'col'}, t)))),
      el('tbody',{}, ...rows.map(r => el('tr',{}, el('th',{scope:'row'}, r.nhan), el('td',{}, tien(r.tong)), el('td',{}, tien(r.tien_mat)), el('td',{}, tien(r.chuyen_khoan)), el('td',{}, String(r.so))))));
    // ---- bố cục: bốn con số quan trọng ở trên cùng, biểu đồ bên trái, việc cần xử lý bên phải, cơ cấu bên dưới ----
    const dsNo = cn.data || [], dsKho = cb.data || [];
    // Tiêu đề ô kèm đường dẫn sang trang đầy đủ (cùng khoảng ngày đang xem).
    const chiTietHref = '/admin/doanh-thu.html?tu=' + k.tu + '&den=' + k.den;
    const dau = (tieuDe) => el('div',{class:'muc-dau'}, el('h2',{}, tieuDe), el('a',{class:'xem-ct',href:chiTietHref,'aria-label':tieuDe + ': xem chi tiết'}, 'Xem chi tiết ', el('span',{'aria-hidden':'true'}, '→')));
    const soNgayQua = d => Math.max(0, Math.floor((Date.now() - new Date(d).getTime()) / 864e5));
    const sap = dsKho.filter(x => x.loai_canh_bao === 'sap_het').length, hh = dsKho.filter(x => x.loai_canh_bao !== 'sap_het').length;
    const kpi = (nhan, giaTri, phu, cls, nhanTt) => el('div',{class:'db-kpi-o ' + (cls || '')},
      el('div',{class:'n'}, nhan, nhanTt || null), el('div',{class:'v'}, giaTri), el('div',{class:'p'}, phu));
    const hangNo = x => el('div',{class:'hang'},
      el('div',{class:'ten'}, x.ten_chu_nuoi, el('div',{class:'nho',style:'font-weight:400'}, x.so_dien_thoai + ', lập ' + A.ngay(x.created_at))),
      el('div',{class:'nho'}, 'Đã thu ' + tien(x.da_thu) + ' / ' + tien(x.tong_tien)),
      el('div',{class:'gt'}, tien(x.con_no)));
    const hangKho = x => el('div',{class:'hang'},
      el('div',{class:'ten'}, x.ten), el('span',{class:'tt do'}, CB[x.loai_canh_bao]),
      el('div',{class:'nho'}, (x.so_lo ? 'Lô ' + x.so_lo + ', hạn ' + A.ngay(x.han_dung) + ', ' : '') + 'còn ' + x.ton));
    const GIOI = 4;
    const xemDu = (nhan, ds, hang) => ds.length > GIOI ? el('details',{class:'db-chi-tiet'}, el('summary',{}, nhan + ' (' + ds.length + ')'), ...ds.slice(GIOI).map(hang)) : null;
    const canXuLy = el('section',{class:'muc'}, el('h2',{}, 'Cần xử lý'),
      el('h3',{class:'db-h3'}, 'Hóa đơn chưa thu đủ'),
      ...(dsNo.length ? dsNo.slice(0, GIOI).map(hangNo) : [A.rong('Không có công nợ.')]), xemDu('Xem thêm hóa đơn chưa thu', dsNo, hangNo),
      el('h3',{class:'db-h3'}, 'Cảnh báo kho'),
      ...(dsKho.length ? dsKho.slice(0, GIOI).map(hangKho) : [A.rong('Kho không có cảnh báo.')]), xemDu('Xem thêm cảnh báo kho', dsKho, hangKho));
    khung.replaceChildren(
      el('div',{class:'db-kpi'},
        kpi('Đã thu trong kỳ', tien(c.tong), el('div',{}, dd, el('div',{class:'nho',style:'margin-top:4px'}, dm(k.tu) + ' đến ' + dm(k.den) + ', ' + k.len + ' ngày')), 'lon'),
        kpi('Công nợ hiện tại', tien(tongNo), dsNo.length ? dsNo.length + ' hóa đơn chưa thu đủ, cũ nhất ' + soNgayQua(dsNo[0].created_at) + ' ngày' : 'Không có hóa đơn nào còn nợ', dsNo.length ? 'canh' : '', dsNo.length ? el('span',{class:'tt do',style:'margin-left:8px'}, 'Cần thu') : null),
        kpi('Lượt khám hoàn thành', String(hoanThanh), tongLich ? 'Hủy hoặc không đến: ' + phanTram((huy + khongDen) / tongLich * 100) + ' (' + (huy + khongDen) + ' lịch)' : 'Chưa có lịch trong kỳ này'),
        kpi('Cảnh báo kho', dsKho.length + ' mục', dsKho.length ? sap + ' sắp hết hàng, ' + hh + ' lô sắp hoặc đã hết hạn' : 'Kho đang ổn', dsKho.length ? 'canh' : '', dsKho.length ? el('span',{class:'tt do',style:'margin-left:8px'}, 'Cần xử lý') : null)),
      el('div',{class:'db-chinh'},
        el('section',{class:'muc'}, dau('Đã thu theo ' + (k.len > 92 ? 'tháng' : 'ngày')), el('div',{class:'db-khung-bd'}, bieuDoCot(rows)),
          el('div',{class:'nho',style:'margin-top:8px'}, c.so + ' lần thu, trung bình ' + tien(dtb) + ' mỗi lần.'),
          el('details',{class:'db-chi-tiet'}, el('summary',{}, 'Xem dạng bảng'), el('div',{class:'db-cuon'}, bang))),
        canXuLy),
      el('div',{class:'db-ba'},
        el('section',{class:'muc'}, dau('Doanh số theo nhóm'), el('div',{class:'nho',style:'margin:8px 0'}, 'Hóa đơn đã lập, chưa hủy.'),
          banhRan([{ ten:'Dịch vụ', v:nhom['Dịch vụ'] || 0, mau:MAU.chinh }, { ten:'Thuốc', v:nhom['Thuốc'] || 0, mau:MAU.phu }, { ten:'Vaccine', v:nhom['Vaccine'] || 0, mau:MAU.thu3 }], 'doanh số')),
        el('section',{class:'muc'}, dau('Hình thức thanh toán'), el('div',{class:'nho',style:'margin:8px 0'}, 'Số tiền đã thu trong kỳ.'),
          banhRan([{ ten:'Tiền mặt', v:c.tm, mau:MAU.chinh }, { ten:'Chuyển khoản', v:c.ck, mau:MAU.phu }], 'đã thu')),
        el('section',{class:'muc'}, dau('Bán chạy nhất'), top.length ? xepHang(top.slice(0, 5)) : A.rong('Chưa có hóa đơn trong kỳ này.'))));
  }
  await ve();
})();
