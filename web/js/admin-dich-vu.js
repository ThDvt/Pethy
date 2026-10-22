(async function(){
  const { db, el, tien } = Pethy, A = Pethy.admin, $ = A.$;
  if (!await A.boot('/admin/dich-vu.html')) return;
  const LOAI = {kham:'Khám bệnh',tiem:'Tiêm phòng'};
  async function tai(){
    const r = await db.from('dich_vu').select('id,ten,loai,gia,dang_ap_dung').order('ten');
    if (r.error) return A.baoLoi('Không tải được danh sách dịch vụ.');
    const luu = async (id, cot) => { A.baoLoi(''); const { error } = await db.from('dich_vu').update(cot).eq('id', id); if (error) A.baoLoi(error.code === '23505' ? 'Tên dịch vụ đã tồn tại.' : 'Không lưu được. Vui lòng kiểm tra lại.'); await tai(); };
    $('vung').replaceChildren(
      el('div',{style:'margin-top:20px;text-align:right'}, el('button',{class:'nut chinh',type:'button',onclick:them},'Thêm dịch vụ')),
      el('div',{style:'border-top:2px solid var(--muc);margin-top:12px'}, ...((r.data || []).length ? r.data.map(d => {
        const g = el('input',{class:'nho so',inputmode:'numeric',value:d.gia,style:'width:110px;text-align:right','aria-label':'Giá ' + d.ten});
        return el('div',{class:'hang'},
          el('div',{class:'ten'}, d.ten, el('div',{class:'nho',style:'font-weight:400'}, LOAI[d.loai] || d.loai)),
          d.dang_ap_dung ? el('span') : el('span',{class:'tt'}, 'Đã ngừng'), g, el('span',{class:'nho'}, 'đ'),
          el('button',{class:'lien-ket',type:'button',onclick:() => { const v = Number(g.value); if (!Number.isInteger(v) || v < 0) return A.baoLoi('Giá phải là số nguyên không âm.'); luu(d.id, { gia: v }); }}, 'Lưu giá'),
          el('button',{class:'lien-ket',type:'button',onclick:() => luu(d.id, { dang_ap_dung: !d.dang_ap_dung })}, d.dang_ap_dung ? 'Ngừng' : 'Áp dụng lại'));
      }) : [A.rong('Chưa có dịch vụ nào.')])));
  }
  function them(){
    const ten = el('input',{id:'d-t',placeholder:'Ví dụ: Khám tổng quát',maxlength:'100'}), loai = el('select',{id:'d-l'}, Object.entries(LOAI).map(([k, v]) => el('option',{value:k}, v))), gia = el('input',{id:'d-g',placeholder:'Ví dụ: 150000',inputmode:'numeric',class:'so'});
    A.hop('Thêm dịch vụ', 'Loại "Tiêm phòng" sẽ hiện khối ghi mũi tiêm ở trang khám của bác sĩ.', [A.o('d-t','Tên dịch vụ',ten), A.o('d-l','Loại',loai), A.o('d-g','Giá (đ)',gia)], 'Thêm', async () => {
      const g = Number(gia.value); if (!ten.value.trim()) return 'Vui lòng nhập tên dịch vụ.'; if (!Number.isInteger(g) || g < 0) return 'Giá phải là số nguyên không âm.';
      const { error } = await db.from('dich_vu').insert({ ten: ten.value.trim(), loai: loai.value, gia: g });
      return error ? (error.code === '23505' ? 'Tên dịch vụ đã tồn tại.' : 'Không thêm được dịch vụ.') : null; }, tai);
  }
  await tai();
})();
