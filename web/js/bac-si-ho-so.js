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
      db.from('ho_so_bac_si').select('chuyen_mon,gioi_thieu,anh_dai_dien,trinh_do,nam_hanh_nghe,so_chung_chi,chung_chi').eq('tai_khoan_id', u.id).maybeSingle()]);
    if (tk.error || hs.error || !tk.data) return A.baoLoi('Không tải được hồ sơ. Vui lòng thử lại.');
    const ten = tk.data.ho_ten, d = hs.data || {};
    const anh = el('div',{style:'flex:0 0 96px;width:96px;height:96px;border-radius:50%;border:1px solid var(--muc);overflow:hidden;display:flex;align-items:center;justify-content:center;font:800 38px var(--chu);background:var(--nen)'},
      d.anh_dai_dien ? el('img',{src:d.anh_dai_dien,alt:'Ảnh đại diện của ' + ten,style:'width:100%;height:100%;object-fit:cover'}) : el('span',{'aria-hidden':'true'}, chuCai(ten)));
    $('vung').replaceChildren(el('div',{style:'display:flex;gap:20px;align-items:flex-start;flex-wrap:wrap;margin-top:20px'}, anh,
      el('div',{style:'flex:1 1 260px;min-width:0'},
        el('div',{style:'font-weight:800;font-size:20px'}, 'Bs. ' + ten),
        el('div',{class:'nho',style:'margin:2px 0 10px'}, d.chuyen_mon || 'Chưa nhập chuyên môn'),
        el('p',{style:'margin:0 0 16px;white-space:pre-wrap;overflow-wrap:anywhere'}, d.gioi_thieu || 'Chưa có phần giới thiệu.'),
        el('div',{style:'border-top:1px solid var(--vach,#ddd);padding-top:12px;margin:0 0 16px'},
          el('div',{class:'nho',style:'font-weight:700;margin-bottom:6px'}, 'Trình độ và chứng chỉ (do quản trị viên cập nhật)'),
          ...[['Trình độ', d.trinh_do], ['Hành nghề từ năm', d.nam_hanh_nghe], ['Chứng chỉ hành nghề', d.so_chung_chi], ['Chứng chỉ và đào tạo', d.chung_chi]]
            .map(([n, v]) => el('div',{style:'margin:2px 0;white-space:pre-wrap;overflow-wrap:anywhere'}, el('span',{class:'nho'}, n + ': '), v ? String(v) : 'Chưa cập nhật')),
          el('div',{class:'nho',style:'margin-top:6px'}, 'Cần bổ sung hoặc sửa, hãy gửi giấy tờ cho quản trị viên qua mục Tin nhắn.')),
        el('button',{class:'nut chinh',type:'button',onclick:() => Pethy.hoSoBacSi.mo({ id: u.id, ho_ten: ten }, tai)}, 'Sửa hồ sơ'))));
  }
  await tai();
})();
