(async function(){
  const { db, el, tien, gio } = Pethy, { loiRpc, khoiDong } = Pethy.khu;
  const $ = id => document.getElementById(id), vung = $('vung');
  const DAT_HO = !!window.DAT_HO;   // lễ tân đặt hộ khách: chọn sẵn một thú cưng, lịch được xác nhận luôn
  const VE = DAT_HO ? '/le-tan/khach-hang.html' : '/chu-nuoi/';
  const ngay = iso => new Date(iso).toLocaleDateString('vi-VN',{weekday:'long',day:'2-digit',month:'2-digit',timeZone:'Asia/Ho_Chi_Minh'});
  if (DAT_HO ? !await khoiDong('le_tan', 'Lễ tân', [], '/le-tan/khach-hang.html') : !await khoiDong('chu_nuoi', 'Chủ nuôi', Pethy.chuNuoi.MUC, '/chu-nuoi/dat-lich.html')) return;
  const thuCungId = new URLSearchParams(location.search).get('thu_cung');
  if (DAT_HO && !thuCungId) { location.replace('/le-tan/khach-hang.html'); return; }

  const doiId = new URLSearchParams(location.search).get('doi');
  const S = { pet: DAT_HO ? thuCungId : null, dv:null, vc:null, bs:null, ngay:null, gio:null, ghiChu:'' };
  let ds = {}, soNgay = 30, tongBuoc = doiId ? 2 : 3;

  const homNay = () => new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Ho_Chi_Minh'});
  const cong = (d, n) => { const x = new Date(d + 'T00:00:00'); x.setDate(x.getDate() + n); return x.toLocaleDateString('en-CA'); };
  function buoc(so, tieuDe){
    const ds = [];
    for (let i = 1; i <= tongBuoc; i++) {
      if (i > 1) ds.push(el('span',{class:'d' + (i <= so ? ' xong' : '')}));
      ds.push(el('span',{class:'b' + (i < so ? ' xong' : i === so ? ' nay' : ''),'aria-hidden':'true'}, i < so ? '✓' : String(i)));
    }
    const bn = $('buoc-so'); bn.className = 'tien-buoc'; bn.setAttribute('role','img'); bn.setAttribute('aria-label','Bước ' + so + ' trên ' + tongBuoc);
    bn.replaceChildren(...ds); $('tieu-de').textContent = tieuDe;
  }
  const loiBox = () => el('p',{class:'loi',id:'loi',role:'alert',hidden:true});
  const baoLoi = m => { const b = $('loi'); b.textContent = m; b.hidden = false; };

  // tải dữ liệu nền
  const [pets, dvs, bss, vcs, cfg] = await Promise.all([
    (DAT_HO ? db.from('thu_cung').select('id,ten,loai').eq('id', thuCungId) : db.from('thu_cung').select('id,ten,loai').order('ten')),
    db.from('dich_vu').select('id,ten,loai,gia').eq('dang_ap_dung', true).order('ten'),
    db.from('bac_si_cong_khai').select('id,ho_ten,chuyen_mon').order('ho_ten'),
    db.from('thuoc').select('id,ten,gia_ban').eq('loai','vaccine').eq('dang_ap_dung', true).order('ten'),
    db.from('cau_hinh').select('khoa,gia_tri').in('khoa',['dat_truoc_toi_da_ngay'])
  ]);
  if ([pets,dvs,bss,vcs].some(r => r.error)) { vung.replaceChildren(el('p',{class:'loi'},'Không tải được dữ liệu. Vui lòng tải lại trang.')); return; }
  ds = { pets: pets.data, dvs: dvs.data, bss: bss.data, vcs: vcs.data };
  // Lựa chọn từ trang chủ (dịch vụ hoặc bác sĩ khách đã bấm): chọn sẵn nếu còn hợp lệ, dùng một lần.
  let chonSan = false;
  if (!doiId && !DAT_HO) {
    try { const o = JSON.parse(localStorage.getItem('pethy_y_dinh') || 'null'); localStorage.removeItem('pethy_y_dinh');
      if (o && Date.now() - o.t < 7 * 864e5) { if (ds.dvs.some(d => d.id === o.dv)) { S.dv = o.dv; chonSan = true; } if (ds.bss.some(b => b.id === o.bs)) { S.bs = o.bs; chonSan = true; } } } catch (_) {}
  }
  soNgay = Number((cfg.data||[]).find(c => c.khoa === 'dat_truoc_toi_da_ngay')?.gia_tri || 30);

  function chonDS(ten, ds_, hien, dat){
    return ds_.map(x => el('label',{class:'chon'},
      el('input',{type:'radio',name:ten,value:x.id,checked: dat === x.id, required:true}),
      el('span',{style:'flex:1'}, hien(x)[0], hien(x)[1] ? el('span',{class:'ghi-chu',style:'display:block'}, hien(x)[1]) : null),
      hien(x)[2] ? el('span',{class:'so',style:'font-size:15px'}, hien(x)[2]) : null));
  }

  // ---- Bước 1: chọn thú cưng, dịch vụ, bác sĩ
  function b1(){
    buoc(1, 'Chọn thú cưng và dịch vụ');
    if (!ds.pets.length) { vung.replaceChildren(el('p',{},'Bạn cần thêm thú cưng trước khi đặt lịch.'), el('a',{class:'nut chinh',href:DAT_HO ? VE : '/chu-nuoi/thu-cung.html'},DAT_HO ? 'Về danh sách khách' : 'Thêm thú cưng')); return; }
    const vcBox = el('div',{id:'vc-box',hidden:true,style:'margin-top:20px'}, el('div',{style:'font-weight:700;margin-bottom:6px'},'Loại vaccine'), ...chonDS('vc', ds.vcs, v => [v.ten, null, tien(v.gia_ban)], S.vc));
    const f = el('form',{novalidate:true},
      chonSan ? el('p',{class:'ghi-chu',style:'margin:0 0 20px'},'Đã chọn sẵn theo lựa chọn của bạn ở trang chủ. Bạn vẫn đổi được bên dưới.') : null,
      el('div',{style:'font-weight:700;margin-bottom:6px'},'Thú cưng'), ...chonDS('pet', ds.pets, p => [p.ten, p.loai], S.pet),
      el('div',{style:'font-weight:700;margin:28px 0 6px'},'Dịch vụ'), ...chonDS('dv', ds.dvs, d => [d.ten, null, tien(d.gia)], S.dv), vcBox,
      el('div',{style:'font-weight:700;margin:28px 0 6px'},'Bác sĩ'), ...chonDS('bs', ds.bss, b => ['Bs. ' + b.ho_ten, b.chuyen_mon], S.bs),
      el('div',{class:'truong',style:'margin-top:28px'}, el('label',{for:'gc'},'Ghi chú cho bác sĩ (không bắt buộc)'), el('textarea',{id:'gc',placeholder:'Ví dụ: bé bỏ ăn từ hôm qua, hay sợ tiếng ồn',maxlength:'300',rows:'3'}, S.ghiChu)),
      loiBox(), el('button',{class:'nut chinh',type:'submit'},'Tiếp tục: chọn giờ'));
    const capNhatVc = () => {
      const dv = ds.dvs.find(d => d.id === (f.dv.value || ''));
      vcBox.hidden = !(dv && dv.loai === 'tiem');
    };
    f.addEventListener('change', capNhatVc);
    f.addEventListener('submit', ev => {
      ev.preventDefault();
      const v = n => (f.elements[n] && f.elements[n].value) || null;
      S.pet = v('pet'); S.dv = v('dv'); S.bs = v('bs'); S.ghiChu = $('gc').value.trim();
      const dv = ds.dvs.find(d => d.id === S.dv);
      S.vc = dv && dv.loai === 'tiem' ? v('vc') : null;
      if (!S.pet || !S.dv || !S.bs) return baoLoi('Vui lòng chọn thú cưng, dịch vụ và bác sĩ.');
      if (dv.loai === 'tiem' && !S.vc) return baoLoi('Vui lòng chọn loại vaccine.');
      b2();
    });
    vung.replaceChildren(f); capNhatVc();
  }

  // ---- Bước 2: chọn ngày và giờ
  function b2(){
    buoc(doiId ? 1 : 2, doiId ? 'Chọn giờ mới' : 'Chọn ngày và giờ');
    const bs = ds.bss.find(b => b.id === S.bs);
    const gioBox = el('div',{id:'gio-box',style:'margin-top:20px'}, el('p',{class:'ghi-chu'},'Chọn ngày để xem giờ còn trống.'));
    const nut = el('button',{class:'nut chinh',type:'button',disabled:true,onclick:() => doiId ? xacNhanDoi() : b3()}, doiId ? 'Đổi sang giờ này' : 'Tiếp tục: xác nhận');
    const o = el('input',{type:'date',id:'ngay',min:homNay(),max:cong(homNay(), soNgay),value:S.ngay || ''});
    async function taiGio(){
      S.gio = null; nut.disabled = true;
      if (!o.value) return;
      S.ngay = o.value;
      gioBox.replaceChildren(el('p',{class:'ghi-chu'},'Đang tải giờ trống…'));
      const r = await db.rpc('khung_gio_trong', { p_bac_si: S.bs, p_ngay: S.ngay });
      if (r.error) { gioBox.replaceChildren(el('p',{class:'loi'}, loiRpc(r.error))); return; }
      if (!r.data.length) { gioBox.replaceChildren(el('p',{class:'ghi-chu'},'Ngày này bác sĩ không còn giờ trống. Thử chọn ngày khác.')); return; }
      const nhom = (ten, arr) => arr.length ? el('div',{style:'margin-bottom:16px'}, el('div',{class:'ghi-chu',style:'margin-bottom:8px'}, ten),
        el('div',{class:'tg'}, arr.map(g => el('button',{type:'button','aria-pressed':'false',onclick:ev => {
          gioBox.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed','false'));
          ev.currentTarget.setAttribute('aria-pressed','true'); S.gio = g.thoi_gian; nut.disabled = false; }}, gio(g.thoi_gian))))) : null;
      const gioVN = g => Number(new Date(g.thoi_gian).toLocaleString('en-GB',{hour:'2-digit',hour12:false,timeZone:'Asia/Ho_Chi_Minh'}));
      gioBox.replaceChildren(nhom('Buổi sáng', r.data.filter(g => gioVN(g) < 12)), nhom('Buổi chiều', r.data.filter(g => gioVN(g) >= 12)));
    }
    o.addEventListener('change', taiGio);
    vung.replaceChildren(
      el('p',{class:'ghi-chu',style:'margin:0 0 20px'}, 'Bs. ' + (bs ? bs.ho_ten : '')),
      el('div',{class:'truong'}, el('label',{for:'ngay'},'Ngày khám (trong ' + soNgay + ' ngày tới)'), o),
      gioBox, el('div',{style:'display:flex;gap:20px;align-items:center;margin-top:24px'}, nut,
        doiId ? el('a',{href:VE},'Quay lại') : el('button',{class:'lien-ket',type:'button',onclick:b1},'Quay lại')),
      loiBox());
    if (S.ngay) taiGio();
  }

  // ---- Bước 3: xác nhận
  function b3(){
    buoc(3, 'Kiểm tra và đặt lịch');
    const pet = ds.pets.find(p => p.id === S.pet), dv = ds.dvs.find(d => d.id === S.dv), bs = ds.bss.find(b => b.id === S.bs), vc = ds.vcs.find(v => v.id === S.vc);
    const dong = (a, b) => el('div',{}, el('span',{class:'ghi-chu'}, a), el('span',{style:'font-weight:700;text-align:right'}, b));
    const gui = el('button',{class:'nut chinh',type:'button',onclick:async () => {
      gui.disabled = true;
      const { error } = await db.rpc('dat_lich', { p_thu_cung:S.pet, p_bac_si:S.bs, p_dich_vu:S.dv, p_thoi_gian:S.gio, p_vaccine:S.vc, p_ghi_chu:S.ghiChu || null });
      if (error) { gui.disabled = false; return baoLoi(loiRpc(error)); }
      if (DAT_HO) xong('Đã đặt lịch hộ khách', 'Lịch đã được xác nhận luôn. Hãy báo lại cho khách giờ hẹn.'); else xong('Đã gửi yêu cầu đặt lịch', 'Phòng khám sẽ xác nhận. Bạn theo dõi trạng thái ở trang Tổng quan.');
    }}, 'Đặt lịch');
    vung.replaceChildren(
      el('div',{class:'tomtat'}, dong('Thú cưng', pet.ten), dong('Dịch vụ', dv.ten + (vc ? ' (' + vc.ten + ')' : '')), dong('Bác sĩ', 'Bs. ' + bs.ho_ten),
        dong('Thời gian', gio(S.gio) + ', ' + ngay(S.gio)), dong('Giá dịch vụ', tien(dv.gia))),
      el('p',{class:'ghi-chu'},'Giá thuốc và vaccine được tính riêng theo đơn khi khám.' + (DAT_HO ? ' Lịch do lễ tân đặt được xác nhận ngay.' : ' Lịch ở trạng thái "Chờ xác nhận" cho đến khi lễ tân xác nhận.')),
      loiBox(), el('div',{style:'display:flex;gap:20px;align-items:center'}, gui, el('button',{class:'lien-ket',type:'button',onclick:b2},'Quay lại')));
  }

  async function xacNhanDoi(){
    const { error } = await db.rpc('doi_lich', { p_lich: doiId, p_thoi_gian: S.gio, p_bac_si: null });
    if (error) return baoLoi(loiRpc(error));
    xong('Đã đổi lịch', 'Lịch của bạn đã được cập nhật và quay về trạng thái chờ xác nhận nếu cần.');
  }
  function xong(t, m){
    $('buoc-so').replaceChildren(); $('buoc-so').removeAttribute('aria-label'); $('tieu-de').textContent = t;
    vung.replaceChildren(el('p',{style:'margin:0 0 24px'}, m), el('a',{class:'nut chinh',href:VE},DAT_HO ? 'Về danh sách khách' : 'Về Tổng quan'));
  }

  if (doiId) {
    const r = await db.from('lich_hen').select('id,bac_si_id').eq('id', doiId).limit(1);
    const l = r.data && r.data[0];
    if (!l) { vung.replaceChildren(el('p',{class:'loi'},'Không tìm thấy lịch cần đổi.'), el('a',{href:VE},'Về Tổng quan')); return; }
    S.bs = l.bac_si_id; b2();
  } else b1();
})();
