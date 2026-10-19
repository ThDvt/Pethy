(async function(){
  const { db, el, gio, tien } = Pethy, { loiRpc, khoiDong } = Pethy.khu, { MUC, TT, uid } = Pethy.bacSi;
  const $ = id => document.getElementById(id);
  if (!await khoiDong('bac_si', 'Bác sĩ', MUC, '/bac-si/')) return;

  const id = new URLSearchParams(location.search).get('lich');
  const thongBao = m => { $('trang-thai').textContent = m || ''; };
  const hien = (cha, ...con) => cha.replaceChildren(...con);
  if (!id) { hien($('vung'), el('p',{class:'loi'},'Thiếu lịch hẹn. Hãy chọn một lịch ở trang Lịch khám.'), el('a',{href:'/bac-si/'},'Về Lịch khám')); hien($('thu-cung-kham')); return; }

  const [rl, rt, rv] = await Promise.all([
    db.from('lich_hen').select('id,thoi_gian,trang_thai,ghi_chu,vaccine_id,thu_cung_id,thu_cung(id,ten,loai,ngay_sinh,chu_nuoi(ho_ten,so_dien_thoai)),dich_vu(ten,loai)').eq('id', id).limit(1),
    db.from('ton_kho_thuoc').select('thuoc_id,ten,don_vi,ton_con_han').eq('loai','thuoc').eq('dang_ap_dung', true).order('ten'),
    db.from('thuoc').select('id,ten').eq('loai','vaccine').eq('dang_ap_dung', true).order('ten')
  ]);
  const l = rl.data && rl.data[0];
  if (rl.error || !l) { hien($('vung'), el('p',{class:'loi'},'Không tìm thấy lịch hẹn.'), el('a',{href:'/bac-si/'},'Về Lịch khám')); hien($('thu-cung-kham')); return; }
  const thuocs = rt.data || [], vaccines = rv.data || [];
  const laTiem = l.dich_vu?.loai === 'tiem';

  // lịch sử khám qua hàm (mỗi lần mở được ghi nhật ký)
  const rh = await db.rpc('xem_ho_so_kham', { p_thu_cung: l.thu_cung_id });
  const lichSu = rh.error ? [] : rh.data;
  const hienTai = lichSu.find(h => h.lich_hen_id === l.id) || null;
  const truoc = lichSu.filter(h => h.lich_hen_id !== l.id);

  // ---- cột thú cưng
  const tuoi = ns => { if (!ns) return ''; const t = Math.floor((Date.now() - new Date(ns)) / 31557600000); return t >= 1 ? t + ' tuổi' : Math.max(1, Math.floor((Date.now() - new Date(ns)) / 2629800000)) + ' tháng tuổi'; };
  const d = iso => new Date(iso).toLocaleDateString('en-GB',{timeZone:'Asia/Ho_Chi_Minh'});
  hien($('thu-cung-kham'),
    el('div',{class:'cap'},'THÚ CƯNG'),
    el('div',{style:'margin-top:8px;font-size:32px;font-weight:800;letter-spacing:-.03em'}, l.thu_cung?.ten),
    el('div',{style:'margin-top:4px;font-size:15px'}, [l.thu_cung?.loai, tuoi(l.thu_cung?.ngay_sinh)].filter(Boolean).join(', ')),
    el('div',{class:'khoi'}, el('div',{class:'ghi-chu'},'Chủ nuôi'), el('div',{style:'font-weight:700'}, l.thu_cung?.chu_nuoi?.ho_ten), el('div',{class:'so'}, l.thu_cung?.chu_nuoi?.so_dien_thoai)),
    el('div',{class:'khoi'}, el('div',{class:'ghi-chu'},'Lịch hẹn này'), el('div',{style:'font-weight:700'}, l.dich_vu?.ten),
      el('div',{class:'so'}, d(l.thoi_gian) + ' ' + gio(l.thoi_gian)),
      l.ghi_chu ? el('div',{style:'margin-top:6px'}, 'Ghi chú của chủ: “' + l.ghi_chu + '”') : null),
    el('div',{class:'cap',style:'margin-top:28px'},'LỊCH SỬ KHÁM'),
    el('div',{style:'margin-top:8px'}, rh.error ? el('p',{class:'loi'},'Không tải được lịch sử khám.') :
      truoc.length ? truoc.map(h => el('div',{class:'ls'}, el('div',{class:'d'}, d(h.thoi_gian)),
        el('div',{style:'margin-top:2px'}, h.chan_doan || h.dich_vu),
        h.don_thuoc && h.don_thuoc.length ? el('div',{class:'ghi-chu'}, 'Thuốc: ' + h.don_thuoc.map(t => t.thuoc).join(', ')) : null))
        : el('p',{class:'ghi-chu'},'Chưa có lần khám trước.')));
  thongBao(hienTai ? 'Đã có hồ sơ, đang sửa' : TT[l.trang_thai]);

  // ---- biểu mẫu
  const dongThuoc = [];
  const ton = tid => { const t = thuocs.find(x => x.thuoc_id === tid); return t ? t.ton_con_han : null; };
  const boxDon = el('div',{id:'don'});
  function themDong(pre){
    const sel = el('select',{'aria-label':'Thuốc'}, el('option',{value:''},'Chọn thuốc'), thuocs.map(t => el('option',{value:t.thuoc_id}, t.ten + ' (' + t.don_vi + ')')));
    const sl = el('input',{type:'number',min:'1',step:'1',inputmode:'numeric','aria-label':'Số lượng',class:'so'});
    const ld = el('input',{type:'text',maxlength:'120','aria-label':'Liều dùng',placeholder:'Ví dụ: ngày 2 lần, sau ăn'});
    const tk = el('div',{class:'tk'}, '');
    const x = el('button',{type:'button',class:'lien-ket','aria-label':'Bỏ dòng thuốc'},'Bỏ');
    const row = el('div',{class:'don'}, el('div',{class:'t'}, sel), el('div',{class:'sl'}, sl), el('div',{class:'ld'}, ld), tk, x);
    const cap = () => { const t = ton(sel.value); tk.textContent = t === null ? '' : 'Tồn ' + t; tk.style.color = (t !== null && Number(sl.value) > t) ? 'var(--loi)' : ''; };
    sel.addEventListener('change', cap); sl.addEventListener('input', cap);
    x.addEventListener('click', () => { row.remove(); dongThuoc.splice(dongThuoc.indexOf(o), 1); });
    const o = { sel, sl, ld };
    if (pre) { const t = thuocs.find(z => z.ten === pre.thuoc); if (t) sel.value = t.thuoc_id; sl.value = pre.so_luong; ld.value = pre.lieu_dung; cap(); }
    dongThuoc.push(o); boxDon.append(row);
  }

  const inp = (idf, v, st) => el('input',{id:idf,value:v ?? '',inputmode:'decimal',style:'font-family:var(--so);' + (st||'')});
  const cn = inp('cn', hienTai?.can_nang), nd = inp('nd', hienTai?.nhiet_do);
  const cd = el('textarea',{id:'cd',rows:'5',style:'border-width:2px;font-size:17px;line-height:1.5',maxlength:'1000'}, hienTai?.chan_doan || '');
  const gc = el('input',{id:'gc',value:hienTai?.ghi_chu || '',maxlength:'300'});
  const loi = el('p',{class:'loi',role:'alert',hidden:true,style:'margin-top:16px'});
  const baoLoi = m => { loi.textContent = m; loi.hidden = !m; };
  const so = v => { v = String(v).trim().replace(',', '.'); return v === '' ? null : Number(v); };

  async function luu(ev){
    ev.currentTarget.disabled = true; baoLoi('');
    const btn = ev.currentTarget;
    try {
      const canNang = so(cn.value), nhietDo = so(nd.value);
      if (!cd.value.trim()) return baoLoi('Vui lòng nhập chẩn đoán.');
      if (canNang !== null && !(canNang > 0)) return baoLoi('Cân nặng phải lớn hơn 0.');
      if (nhietDo !== null && !(nhietDo >= 30 && nhietDo <= 45)) return baoLoi('Nhiệt độ cần nằm trong khoảng 30 đến 45 độ C.');
      const dong = dongThuoc.filter(o => o.sel.value || o.sl.value || o.ld.value.trim());
      for (const o of dong) if (!o.sel.value || !(Number(o.sl.value) > 0) || !o.ld.value.trim()) return baoLoi('Mỗi dòng thuốc cần đủ thuốc, số lượng và liều dùng.');
      const a = await db.rpc('ghi_ho_so_kham', { p_lich: l.id, p_chan_doan: cd.value.trim(), p_can_nang: canNang, p_nhiet_do: nhietDo, p_ghi_chu: gc.value.trim() || null });
      if (a.error) return baoLoi(loiRpc(a.error));
      if (dong.length) {
        const b = await db.rpc('ke_don', { p_ho_so: a.data, p_dong: dong.map(o => ({ thuoc_id: o.sel.value, so_luong: Number(o.sl.value), lieu_dung: o.ld.value.trim() })) });
        if (b.error) return baoLoi('Đã lưu hồ sơ khám nhưng chưa lưu được đơn thuốc: ' + loiRpc(b.error));
      }
      thongBao('Đã lưu'); location.href = '/bac-si/';
    } finally { btn.disabled = false; }
  }

  const tiem = laTiem ? (() => {
    const vc = el('select',{id:'vc'}, el('option',{value:''},'Chọn vaccine'), vaccines.map(v => el('option',{value:v.id,selected: v.id === l.vaccine_id}, v.ten)));
    const nt = el('input',{id:'nt',type:'date',min:new Date(Date.now()+864e5).toISOString().slice(0,10)});
    const nut = el('button',{class:'nut chinh',type:'button',onclick:async ev => {
      baoLoi(''); if (!vc.value) return baoLoi('Vui lòng chọn vaccine.');
      ev.currentTarget.disabled = true;
      const { error } = await db.rpc('ghi_tiem', { p_lich: l.id, p_ngay_tiem_tiep: nt.value || null, p_vaccine: vc.value });
      ev.currentTarget.disabled = false;
      if (error) return baoLoi(loiRpc(error)); location.href = '/bac-si/';
    }}, 'Ghi mũi tiêm');
    return el('div',{style:'margin-top:36px;padding-top:20px;border-top:2px solid var(--muc)'},
      el('div',{style:'font-size:18px;font-weight:800'},'Mũi tiêm'),
      el('div',{class:'ghi-chu',style:'margin:4px 0 14px'},'Ghi mũi tiêm sẽ trừ 1 liều vaccine trong kho và hoàn thành lịch hẹn.'),
      el('div',{style:'display:flex;flex-wrap:wrap;gap:16px 24px;align-items:flex-end'},
        el('div',{class:'truong',style:'margin:0;flex:1 1 220px'}, el('label',{for:'vc'},'Loại vaccine'), vc),
        el('div',{class:'truong',style:'margin:0;flex:0 1 200px'}, el('label',{for:'nt'},'Ngày tiêm tiếp theo (nếu có)'), nt), nut));
  })() : null;

  hien($('vung'),
    el('div',{style:'margin-top:28px;display:flex;flex-wrap:wrap;gap:20px'},
      el('div',{class:'truong',style:'flex:0 1 160px;margin:0'}, el('label',{for:'cn'},'Cân nặng (kg)'), cn),
      el('div',{class:'truong',style:'flex:0 1 160px;margin:0'}, el('label',{for:'nd'},'Nhiệt độ (°C)'), nd)),
    el('div',{style:'margin-top:24px'}, el('label',{for:'cd',style:'font-size:18px;font-weight:800;color:var(--muc);margin-bottom:8px'},'Chẩn đoán'), cd),
    el('div',{class:'truong',style:'margin-top:20px'}, el('label',{for:'gc'},'Ghi chú thêm'), gc),
    el('div',{style:'margin-top:32px;display:flex;flex-wrap:wrap;gap:8px 24px;justify-content:space-between;align-items:baseline'},
      el('div',{style:'font-size:18px;font-weight:800'},'Đơn thuốc'),
      el('div',{class:'nho',style:'font-size:13px;color:var(--xam)'},'Lưu đơn sẽ trừ kho ngay, theo lô gần hết hạn trước.')),
    el('div',{style:'margin-top:8px;border-top:2px solid var(--muc)'}, boxDon),
    el('div',{style:'margin-top:12px'}, el('button',{class:'lien-ket',type:'button',style:'font-weight:700;min-height:44px',onclick:() => themDong()},'+ Thêm thuốc')),
    loi,
    el('div',{style:'margin-top:28px;padding-top:20px;border-top:1px solid var(--vach);display:flex;flex-wrap:wrap;gap:16px 28px;align-items:center'},
      el('button',{class:'nut chinh',type:'button',style:'padding:16px 28px',onclick:luu},'Lưu hồ sơ và đơn thuốc'),
      el('div',{class:'nho',style:'font-size:13px;color:var(--xam);max-width:420px'},'Lịch hẹn chuyển sang "Đã hoàn thành". Không sửa được đơn sau khi thu ngân lập hóa đơn.')),
    ...(tiem ? [tiem] : []));
  if (hienTai && hienTai.don_thuoc && hienTai.don_thuoc.length) hienTai.don_thuoc.forEach(themDong);
  else if (!laTiem) themDong();
})();
