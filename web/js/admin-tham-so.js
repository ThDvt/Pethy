(async function(){
  const { db, el } = Pethy, A = Pethy.admin, $ = A.$;
  if (!await A.boot('/admin/tham-so.html')) return;
  const SO = ['do_dai_khung_gio_phut','dat_truoc_toi_da_ngay','dat_truoc_toi_thieu_gio','huy_doi_truoc_gio','gioi_han_lich_cho','canh_bao_han_dung_ngay'];
  async function tai(){
    const r = await db.from('cau_hinh').select('khoa,gia_tri,mo_ta,cong_khai').order('khoa');
    if (r.error) return A.baoLoi('Không tải được tham số.');
    const luu = async (khoa, gt) => { A.baoLoi(''); const { error } = await db.from('cau_hinh').update({ gia_tri: gt }).eq('khoa', khoa); if (error) A.baoLoi('Không lưu được tham số.'); await tai(); };
    $('vung').replaceChildren(el('div',{style:'border-top:2px solid var(--muc);margin-top:20px'}, ...(r.data || []).map(c => {
      if (c.khoa === 'che_do_bao_tri') {
        const bat = c.gia_tri === 'true';
        return el('div',{class:'hang'}, el('div',{class:'ten'}, 'Chế độ bảo trì', el('div',{class:'nho',style:'font-weight:400'}, 'Khi bật, khách và nhân viên không dùng được web, chỉ quản trị vẫn vào được.')),
          bat ? el('span',{class:'tt do'}, 'Đang bật') : el('span',{class:'tt'}, 'Đang tắt'),
          el('button',{class:bat ? 'nut' : 'nut chinh',type:'button',onclick:() => { if (!bat && !confirm('Bật bảo trì sẽ chặn mọi người dùng trừ quản trị. Tiếp tục?')) return; luu(c.khoa, bat ? 'false' : 'true'); }}, bat ? 'Tắt bảo trì' : 'Bật bảo trì'));
      }
      const la = SO.includes(c.khoa), v = el(la ? 'input' : 'input',{class:'nho' + (la ? ' so' : ''),value:c.gia_tri,style:la ? 'width:90px;text-align:right' : 'width:260px','aria-label':c.khoa,maxlength:la ? '4' : '200'});
      return el('div',{class:'hang'}, el('div',{class:'ten'}, c.khoa === 'thong_bao_bao_tri' ? 'Nội dung thông báo bảo trì' : c.mo_ta, el('div',{class:'nho so',style:'font-weight:400'}, c.khoa)), v,
        el('button',{class:'lien-ket',type:'button',onclick:() => {
          const s = v.value.trim(); if (la && !/^[1-9][0-9]{0,3}$/.test(s)) return A.baoLoi('Giá trị phải là số nguyên dương.'); if (!s) return A.baoLoi('Giá trị không được để trống.'); luu(c.khoa, s); }}, 'Lưu'));
    })));
  }
  await tai();
})();
