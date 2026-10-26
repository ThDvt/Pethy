(async function(){
  const { db, el } = Pethy, A = Pethy.admin, $ = A.$;
  const vt = await Pethy.vaiTro();
  if (!vt) { location.replace('/dang-nhap.html'); return; }
  if (vt !== 'bac_si') { location.replace(vt === 'admin' ? '/admin/tai-khoan.html' : (Pethy.KHU[vt] || '/')); return; }
  if (!await Pethy.khu.khoiDong('bac_si', 'Bác sĩ', [], '/bac-si/ho-so.html')) return;
  const u = (await db.auth.getUser()).data?.user; if (!u) return;
  const chuCai = ten => (String(ten).trim().split(/\s+/).pop() || '?').charAt(0).toUpperCase();
  async function tai(){
    const [tk, hs] = await Promise.all([
      db.from('tai_khoan').select('ho_ten').eq('id', u.id).maybeSingle(),
      db.from('ho_so_bac_si').select('chuyen_mon,gioi_thieu,anh_dai_dien,trinh_do,kinh_nghiem_nam,chung_chi').eq('tai_khoan_id', u.id).maybeSingle()]);
    if (tk.error || hs.error || !tk.data) return A.baoLoi('Không tải được hồ sơ. Vui lòng thử lại.');
    const ten = tk.data.ho_ten, d = hs.data || {};
    const anh = el('div',{style:'flex:0 0 96px;width:96px;height:96px;border-radius:50%;border:1px solid var(--muc);overflow:hidden;display:flex;align-items:center;justify-content:center;font:800 38px var(--chu);background:var(--nen)'},
      d.anh_dai_dien ? el('img',{src:d.anh_dai_dien,alt:'Ảnh đại diện của ' + ten,style:'width:100%;height:100%;object-fit:cover'}) : el('span',{'aria-hidden':'true'}, chuCai(ten)));
    $('vung').replaceChildren(el('div',{style:'display:flex;gap:20px;align-items:flex-start;flex-wrap:wrap;margin-top:20px'}, anh,
      el('div',{style:'flex:1 1 260px;min-width:0'},
        el('div',{style:'font-weight:800;font-size:20px'}, 'Bs. ' + ten),
        el('div',{class:'nho',style:'margin:2px 0 10px'}, d.chuyen_mon || 'Chưa nhập chuyên môn'),
        el('p',{style:'margin:0 0 12px;white-space:pre-wrap;overflow-wrap:anywhere'}, d.gioi_thieu || 'Chưa có phần giới thiệu.'),
        el('dl',{style:'margin:0 0 16px;display:grid;grid-template-columns:auto 1fr;gap:4px 14px;font-size:15px'},
          el('dt',{class:'nho'}, 'Trình độ'), el('dd',{style:'margin:0'}, d.trinh_do || 'Chưa nhập'),
          el('dt',{class:'nho'}, 'Kinh nghiệm'), el('dd',{style:'margin:0'}, d.kinh_nghiem_nam != null ? d.kinh_nghiem_nam + ' năm' : 'Chưa nhập'),
          el('dt',{class:'nho'}, 'Chứng chỉ'), el('dd',{style:'margin:0;white-space:pre-line'}, d.chung_chi || 'Chưa nhập')),
        el('button',{class:'nut chinh',type:'button',onclick:() => Pethy.hoSoBacSi.mo({ id: u.id, ho_ten: ten }, tai)}, 'Sửa hồ sơ'))));
  }
  await tai();
})();
