(async function(){
  const { db, el, gio, tien } = Pethy, { loiRpc, khoiDong } = Pethy.khu;
  const $ = id => document.getElementById(id);
  if (!await khoiDong('kho', 'Thủ kho', [{ten:'Tồn kho',href:'/kho/'}], '/kho/')) return;

  const baoLoi = m => { $('loi-chung').textContent = m || ''; $('loi-chung').hidden = !m; };
  const ngay = s => { const [y, m, d] = String(s).slice(0, 10).split('-'); return d + '/' + m + '/' + y; };
  const LOAI = {nhap:'Nhập kho',xuat_ke_don:'Xuất theo đơn',xuat_tiem:'Xuất tiêm',dieu_chinh:'Điều chỉnh'};
  const KIEU = {thuoc:'Thuốc',vaccine:'Vaccine'};
  let thuocs = [];

  async function tai(){
    const [rt, rl, rb, rc] = await Promise.all([
      db.from('ton_kho_thuoc').select('thuoc_id,ten,loai,don_vi,nguong_canh_bao,dang_ap_dung,ton_con_han,ton_het_han').order('ten'),
      db.from('ton_kho_lo').select('lo_thuoc_id,thuoc_id,so_lo,han_dung,ton,het_han').order('han_dung'),
      db.from('bien_dong_kho').select('id,loai,so_luong,ly_do,thoi_gian,lo_thuoc(so_lo,thuoc(ten,don_vi))').order('thoi_gian',{ascending:false}).limit(20),
      db.from('canh_bao_kho').select('loai_canh_bao,ten,so_lo,han_dung,ton')
    ]);
    if (rt.error || rl.error) { baoLoi('Không tải được dữ liệu kho. Vui lòng tải lại trang.'); return; }
    thuocs = rt.data || [];
    const lo = {}; (rl.data || []).forEach(x => (lo[x.thuoc_id] = lo[x.thuoc_id] || []).push(x));

    $('ds-ton').replaceChildren(...(thuocs.length ? thuocs.map(t => {
      const sap = t.dang_ap_dung && t.ton_con_han <= t.nguong_canh_bao;
      const lots = (lo[t.thuoc_id] || []).filter(x => x.ton > 0 || !x.het_han);
      return el('details',{},
        el('summary',{class:'hang',style:'cursor:pointer;list-style:none'},
          el('div',{class:'ten'}, t.ten, el('span',{class:'nho',style:'font-weight:400'}, '  ' + KIEU[t.loai] + ', ' + t.don_vi), t.dang_ap_dung ? '' : el('span',{class:'nho',style:'font-weight:400'}, ', đã ngừng')),
          sap ? el('span',{class:'tt do'}, 'Sắp hết') : el('span'),
          t.ton_het_han > 0 ? el('span',{class:'tt do'}, t.ton_het_han + ' hết hạn') : el('span'),
          el('div',{class:'sl'}, String(t.ton_con_han))),
        el('div',{class:'con'}, ...(lots.length ? lots.map(x => el('div',{class:'hang'},
          el('div',{class:'lo'}, 'Lô ' + x.so_lo, el('div',{class:'nho'}, 'Hạn ' + ngay(x.han_dung) + (x.het_han ? ', đã hết hạn' : ''))),
          el('div',{class:'sl'}, String(x.ton)),
          el('button',{class:'lien-ket',type:'button',onclick:() => moDieuChinh(t, x)}, 'Kiểm kê, sửa số lượng'))) : [el('p',{class:'nho',style:'padding:10px 0;margin:0'}, 'Chưa có lô nào.')])));
    }) : [el('p',{class:'nho',style:'padding:14px 0'}, 'Chưa có thuốc nào trong danh mục.')]));

    $('ds-ls').replaceChildren(...((rb.data || []).length ? rb.data.map(b => el('div',{class:'hang'},
      el('div',{class:'ten',style:'font-weight:400'}, (b.lo_thuoc?.thuoc?.ten || '') + ', lô ' + (b.lo_thuoc?.so_lo || ''),
        el('div',{class:'nho'}, LOAI[b.loai] + (b.ly_do ? ': ' + b.ly_do : ''))),
      el('div',{class:'nho'}, ngay(b.thoi_gian) + ' ' + gio(b.thoi_gian)),
      el('div',{class:'sl'}, (b.so_luong > 0 ? '+' : '') + b.so_luong))) : [el('p',{class:'nho',style:'padding:14px 0'}, 'Chưa có biến động nào.')]));

    const CB = {sap_het:'Sắp hết hàng',sap_het_han:'Lô sắp hết hạn',het_han:'Lô đã hết hạn còn tồn'};
    const cb = rc.data || [];
    $('ds-cb').replaceChildren(...(cb.length ? cb.map(c => el('div',{class:'canh'},
      el('div',{style:'font-weight:700'}, c.ten), el('div',{class:'nho'}, CB[c.loai_canh_bao] + (c.so_lo ? ', lô ' + c.so_lo + ', hạn ' + ngay(c.han_dung) : '') + ', còn ' + c.ton))) : [el('p',{class:'nho'}, 'Không có cảnh báo.')]));
  }

  function hop(noiDung){ $('hop-nd').replaceChildren(...noiDung.filter(Boolean)); $('hop').showModal(); }
  function khung(tieuDe, truong, nutTen, hanhDong, phu, sauKhi){
    const loi = el('p',{class:'loi',role:'alert',hidden:true});
    const ml = m => { loi.textContent = m || ''; loi.hidden = !m; };
    hop([el('h2',{style:'margin:0 0 4px;font-size:22px'}, tieuDe), phu ? el('div',{class:'nho',style:'margin-bottom:12px'}, phu) : el('div',{style:'height:12px'}),
      el('div',{class:'luoi'}, ...truong), loi,
      el('div',{style:'display:flex;gap:16px;justify-content:flex-end;align-items:center;margin-top:20px'},
        el('button',{class:'lien-ket',type:'button',onclick:() => $('hop').close()}, 'Đóng'),
        el('button',{class:'nut chinh',type:'button',onclick:async ev => {
          ml(''); const nutBam = ev.currentTarget; nutBam.disabled = true;
          const e = await hanhDong();
          if (e) { nutBam.disabled = false; return ml(e); }
          $('hop').close(); await tai(); if (sauKhi) sauKhi(); }}, nutTen))]);
  }
  const o = (id, nhan, ...c) => el('div',{class:'truong'}, el('label',{for:id}, nhan), ...c);

  // Nhập hàng về kho. truocId: chọn sẵn thuốc (dùng ngay sau khi thêm thuốc mới).
  function moNhapKho(truocId){
    const dsThuoc = thuocs.filter(t => t.dang_ap_dung);
    if (!dsThuoc.length) return khung('Chưa có thuốc để nhập', [el('p',{class:'nho',style:'margin:0'}, 'Danh mục chưa có thuốc hay vaccine nào. Hãy thêm thuốc vào danh mục trước, sau đó quay lại nhập hàng.')], 'Thêm thuốc mới', async () => { setTimeout(moThemThuoc, 0); return null; });
    const sel = el('select',{id:'n-t'}, el('option',{value:''}, 'Chọn thuốc hoặc vaccine'), dsThuoc.map(t => el('option',{value:t.thuoc_id}, t.ten + ' (' + t.don_vi + ')')));
    if (truocId) sel.value = truocId;
    const lo = el('input',{id:'n-lo',placeholder:'Ví dụ: LO2410A',maxlength:'40'}), han = el('input',{id:'n-h',type:'date',min:new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Ho_Chi_Minh'})});
    const sl = el('input',{id:'n-s',placeholder:'Ví dụ: 50',inputmode:'numeric',class:'so'});
    const dv = el('span',{class:'nho',id:'n-dv'}); const capDv = () => { const t = dsThuoc.find(x => x.thuoc_id === sel.value); dv.textContent = t ? 'Tính theo ' + t.don_vi : ''; };
    sel.addEventListener('change', capDv); capDv();
    const goiY = t => el('div',{class:'nho',style:'margin-top:4px'}, t);
    khung('Nhập hàng vào kho', [
        o('n-t','Thuốc hoặc vaccine',sel, el('a',{href:'#',class:'nho',style:'margin-top:4px;display:inline-block',onclick:ev => { ev.preventDefault(); $('hop').close(); moThemThuoc(); }}, 'Chưa có trong danh sách? Thêm thuốc mới')),
        o('n-lo','Số lô',lo, goiY('Dãy chữ và số in trên hộp hoặc vỏ chai. Mỗi đợt hàng có một số lô riêng.')),
        o('n-h','Hạn dùng',han, goiY('Ngày hết hạn in trên bao bì.')),
        o('n-s','Số lượng nhập',sl, dv)],
      'Nhập vào kho', async () => {
      const n = Number(sl.value);
      if (!sel.value) return 'Vui lòng chọn thuốc.'; if (!lo.value.trim()) return 'Vui lòng nhập số lô.';
      if (!han.value) return 'Vui lòng chọn hạn dùng.'; if (!Number.isInteger(n) || n <= 0) return 'Số lượng phải là số nguyên lớn hơn 0.';
      const { error } = await db.rpc('nhap_kho', { p_thuoc: sel.value, p_so_lo: lo.value.trim(), p_han_dung: han.value, p_so_luong: n });
      return error ? loiRpc(error) : null;
    }, 'Mỗi lần có hàng về, ghi một lần. Nếu trùng số lô và hạn dùng với lô đã có thì số lượng được cộng dồn vào lô đó.');
  }
  $('nhap').addEventListener('click', () => moNhapKho());

  function moDieuChinh(t, x){
    const sl = el('input',{id:'d-s',inputmode:'numeric',class:'so',value:x.ton}), ld = el('input',{id:'d-l',maxlength:'200',placeholder:'Ví dụ: kiểm kê thiếu 2 hộp'});
    khung('Điều chỉnh tồn kho', [o('d-s','Số lượng thực tế đếm được',sl), o('d-l','Lý do (bắt buộc)',ld)], 'Lưu điều chỉnh', async () => {
      const n = Number(sl.value);
      if (!Number.isInteger(n) || n < 0) return 'Số lượng phải là số nguyên không âm.'; if (!ld.value.trim()) return 'Vui lòng ghi lý do điều chỉnh.';
      const { error } = await db.rpc('dieu_chinh_kho', { p_lo: x.lo_thuoc_id, p_so_luong_moi: n, p_ly_do: ld.value.trim() });
      return error ? loiRpc(error) : null;
    }, t.ten + ', lô ' + x.so_lo + ', hiện còn ' + x.ton + '. Việc điều chỉnh được ghi lại trong lịch sử.');
  }

  function moThemThuoc(){
    let moi = null;
    const ten = el('input',{id:'t-t',placeholder:'Ví dụ: Amoxicillin 250mg',maxlength:'100'}), dv = el('input',{id:'t-d',maxlength:'30',placeholder:'viên, chai, liều...'});
    const loai = el('select',{id:'t-l'}, el('option',{value:'thuoc'},'Thuốc'), el('option',{value:'vaccine'},'Vaccine'));
    const gia = el('input',{id:'t-g',placeholder:'Ví dụ: 25000',inputmode:'numeric',class:'so'}), nguong = el('input',{id:'t-n',placeholder:'Báo sắp hết khi tồn xuống mức này',inputmode:'numeric',class:'so',value:'10'});
    khung('Thêm thuốc mới', [o('t-t','Tên',ten), o('t-l','Loại',loai), o('t-d','Đơn vị',dv), o('t-g','Giá bán (đ)',gia), o('t-n','Báo sắp hết khi tồn còn từ',nguong)], 'Thêm', async () => {
      const g = Number(gia.value), n = Number(nguong.value);
      if (!ten.value.trim() || !dv.value.trim()) return 'Vui lòng nhập tên và đơn vị.';
      if (!Number.isInteger(g) || g < 0) return 'Giá bán phải là số nguyên không âm.'; if (!Number.isInteger(n) || n < 0) return 'Ngưỡng cảnh báo phải là số nguyên không âm.';
      const { data, error } = await db.from('thuoc').insert({ ten: ten.value.trim(), loai: loai.value, don_vi: dv.value.trim(), gia_ban: g, nguong_canh_bao: n }).select('id').maybeSingle();
      if (!error && data) moi = data.id;
      return error ? (error.code === '23505' ? 'Thuốc này đã có trong danh mục.' : 'Không thêm được thuốc. Vui lòng kiểm tra lại thông tin.') : null;
    }, 'Đây là khai báo một lần trong danh mục, chưa có số lượng. Thêm xong, web sẽ mở bước nhập hàng để bạn ghi số lượng đầu tiên.', () => moNhapKho(moi));
  }
  $('them-thuoc').addEventListener('click', moThemThuoc);

  await tai();
})();
