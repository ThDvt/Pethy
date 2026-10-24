(async function(){
  const { db, el, tien } = Pethy, A = Pethy.admin, $ = A.$;
  if (!await A.boot('/admin/dich-vu.html')) return;
  const LOAI = {kham:'Khám bệnh',tiem:'Tiêm phòng'};
  let coAnh = true;   // false nếu cơ sở dữ liệu chưa chạy 08_anh_dich_vu.sql
  async function tai(){
    let r = await db.from('dich_vu').select('id,ten,loai,gia,mo_ta,anh,dang_ap_dung').order('ten');
    if (r.error) { r = await db.from('dich_vu').select('id,ten,loai,gia,mo_ta,dang_ap_dung').order('ten'); coAnh = false; }
    if (r.error) return A.baoLoi('Không tải được danh sách dịch vụ.');
    const luu = async (id, cot) => { A.baoLoi(''); const { error } = await db.from('dich_vu').update(cot).eq('id', id); if (error) A.baoLoi(error.code === '23505' ? 'Tên dịch vụ đã tồn tại.' : 'Không lưu được. Vui lòng kiểm tra lại.'); await tai(); };
    $('vung').replaceChildren(
      el('div',{style:'margin-top:20px;text-align:right'}, el('button',{class:'nut chinh',type:'button',onclick:them},'Thêm dịch vụ')),
      el('div',{style:'border-top:2px solid var(--muc);margin-top:12px'}, ...((r.data || []).length ? r.data.map(d => {
        const g = el('input',{class:'nho so',inputmode:'numeric',value:d.gia,style:'width:110px;text-align:right','aria-label':'Giá ' + d.ten});
        return el('div',{class:'hang'},
          d.anh ? el('img',{src:Pethy.anhCongKhai('anh-dich-vu', d.anh),alt:'',width:56,height:42,style:'width:56px;height:42px;object-fit:cover;border:1px solid var(--vach);border-radius:2px'}) : null,
          el('div',{class:'ten'}, d.ten, el('div',{class:'nho',style:'font-weight:400'}, (LOAI[d.loai] || d.loai) + (d.mo_ta ? '' : ', chưa có mô tả') + (coAnh && !d.anh ? ', dùng ảnh mặc định' : ''))),
          d.dang_ap_dung ? el('span') : el('span',{class:'tt'}, 'Đã ngừng'), g, el('span',{class:'nho'}, 'đ'),
          el('button',{class:'lien-ket',type:'button',onclick:() => { const v = Number(g.value); if (!Number.isInteger(v) || v < 0) return A.baoLoi('Giá phải là số nguyên không âm.'); luu(d.id, { gia: v }); }}, 'Lưu giá'),
          el('button',{class:'lien-ket',type:'button',onclick:() => suaMoTa(d)}, 'Mô tả'),
          coAnh ? el('button',{class:'lien-ket',type:'button',onclick:() => suaAnh(d)}, d.anh ? 'Đổi ảnh' : 'Ảnh') : null,
          el('button',{class:'lien-ket',type:'button',onclick:() => luu(d.id, { dang_ap_dung: !d.dang_ap_dung })}, d.dang_ap_dung ? 'Ngừng' : 'Áp dụng lại'));
      }) : [A.rong('Chưa có dịch vụ nào.')])));
  }
  function suaMoTa(d){
    const mt = el('textarea',{id:'d-mt',rows:'5',maxlength:'500',placeholder:'Ví dụ: Khám toàn diện cân nặng, nhiệt độ, tim phổi, da lông. Bác sĩ tư vấn dinh dưỡng và lịch tiêm.'}); mt.value = d.mo_ta || '';
    A.hop('Mô tả: ' + d.ten, 'Khách xem đoạn này trên trang chủ. Để trống thì web hiện mô tả mặc định theo loại dịch vụ.', [A.o('d-mt','Mô tả (tối đa 500 ký tự)',mt)], 'Lưu mô tả', async () => {
      const { error } = await db.from('dich_vu').update({ mo_ta: mt.value.trim() || null }).eq('id', d.id);
      return error ? 'Không lưu được mô tả.' : null; }, tai);
  }
  // Thu nhỏ và nén ảnh ngay trên trình duyệt: tối đa 1000 px chiều ngang, WebP (dự phòng JPEG), dưới 2 MB.
  async function nenAnh(file){
    const bm = await createImageBitmap(file), k = Math.min(1, 1000 / bm.width);
    const cv = document.createElement('canvas'); cv.width = Math.round(bm.width * k); cv.height = Math.round(bm.height * k);
    cv.getContext('2d').drawImage(bm, 0, 0, cv.width, cv.height);
    for (const q of [0.85, 0.7, 0.55]) {
      const b = await new Promise(ok => cv.toBlob(ok, 'image/webp', q));
      if (b && b.size <= 2097152) return b;
    }
    throw new Error('Ảnh quá lớn');
  }
  function suaAnh(d){
    const BUCKET = 'anh-dich-vu';
    const xem = el('img',{alt:'Ảnh đang dùng',style:'width:100%;max-width:320px;aspect-ratio:4/3;object-fit:cover;border:2px solid var(--muc);border-radius:2px;background:var(--nen-nhat);display:block'});
    const mac = d.anh ? Pethy.anhCongKhai(BUCKET, d.anh) : '';
    if (mac) xem.src = mac; else xem.hidden = true;
    const tep = el('input',{id:'d-anh',type:'file',accept:'image/jpeg,image/png,image/webp'});
    tep.addEventListener('change', () => { const f = tep.files[0]; if (!f) return; xem.src = URL.createObjectURL(f); xem.hidden = false; });
    const xoa = d.anh ? el('button',{class:'lien-ket',type:'button',style:'color:var(--loi)',onclick:async () => {
      if (!await Pethy.xacNhan('Xóa ảnh dịch vụ?', 'Trang chủ sẽ dùng ảnh mặc định (nếu có) hoặc không hiện ảnh cho dịch vụ này.', 'Xóa ảnh', 'nguy-hiem', 'Giữ ảnh')) return;
      const { error } = await db.from('dich_vu').update({ anh: null }).eq('id', d.id);
      if (error) return A.baoLoi('Không xóa được ảnh.');
      await db.storage.from(BUCKET).remove([d.anh]); $('hop').close(); tai(); }}, 'Xóa ảnh này') : null;
    A.hop('Ảnh: ' + d.ten, 'Khách thấy ảnh này trên thẻ dịch vụ ở trang chủ. Chọn ảnh ngang (tỉ lệ 4:3 là đẹp nhất). Web tự thu nhỏ và nén, không cần xử lý trước.',
      [el('div',{class:'truong'}, xem), A.o('d-anh','Chọn ảnh (JPEG, PNG hoặc WebP)',tep), xoa ? el('div',{class:'truong'}, xoa) : null].filter(Boolean), 'Lưu ảnh', async () => {
      const f = tep.files[0]; if (!f) return 'Vui lòng chọn một ảnh.';
      if (!/^image\/(jpeg|png|webp)$/.test(f.type)) return 'Chỉ nhận ảnh JPEG, PNG hoặc WebP.';
      if (f.size > 15 * 1048576) return 'Ảnh quá lớn (tối đa 15 MB).';
      let blob; try { blob = await nenAnh(f); } catch (_) { return 'Không đọc được ảnh này. Hãy thử ảnh khác.'; }
      const path = d.id + '/' + Date.now() + '.webp';
      const up = await db.storage.from(BUCKET).upload(path, blob, { contentType: 'image/webp', cacheControl: '31536000', upsert: false });
      if (up.error) return 'Không tải được ảnh lên. Kiểm tra đã chạy 08_anh_dich_vu.sql trong Supabase chưa.';
      const { error } = await db.from('dich_vu').update({ anh: path }).eq('id', d.id);
      if (error) { await db.storage.from(BUCKET).remove([path]); return 'Không lưu được ảnh. Vui lòng thử lại.'; }
      if (d.anh) await db.storage.from(BUCKET).remove([d.anh]);
      return null; }, tai);
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
