(async function(){
  const { db, el, xacNhan } = Pethy, A = Pethy.admin, $ = A.$, BV = Pethy.baiViet;
  if (!await A.boot('/admin/bai-viet.html')) return;
  const COT = 'id,tieu_de,nhom,tom_tat,noi_dung,tac_gia,trang_thai,ngay_dang,created_at';
  async function tai(){
    const r = await db.from('bai_viet').select(COT).order('created_at',{ascending:false});
    if (r.error) return A.baoLoi('Không tải được danh sách bài viết. Nếu mới cập nhật web, hãy chạy db/10_bai_viet.sql trong Supabase.');
    const luu = async (id, cot) => { A.baoLoi(''); const { error } = await db.from('bai_viet').update(cot).eq('id', id); if (error) A.baoLoi('Không lưu được. Vui lòng thử lại.'); await tai(); };
    $('vung').replaceChildren(
      el('div',{style:'margin-top:20px;text-align:right'}, el('button',{class:'nut chinh',type:'button',onclick:() => soan(null)},'Viết bài mới')),
      el('div',{style:'border-top:2px solid var(--muc);margin-top:12px'}, ...((r.data || []).length ? r.data.map(b => {
        const dang = b.trang_thai === 'da_dang';
        return el('div',{class:'hang'},
          el('div',{class:'ten'}, b.tieu_de, el('div',{class:'nho',style:'font-weight:400'}, (BV.NHOM[b.nhom] || b.nhom) + ' · ' + (dang ? 'Đã đăng ' + BV.ngay(b.ngay_dang) : 'Nháp'))),
          dang ? el('span') : el('span',{class:'tt'}, 'Nháp'),
          el('a',{class:'lien-ket',href:'/bai-viet.html?id=' + b.id,target:'_blank',rel:'noopener'}, 'Xem'),
          el('button',{class:'lien-ket',type:'button',onclick:() => soan(b)}, 'Sửa'),
          el('button',{class:'lien-ket',type:'button',onclick:() => luu(b.id, { trang_thai: dang ? 'nhap' : 'da_dang' })}, dang ? 'Gỡ xuống' : 'Đăng'),
          el('button',{class:'lien-ket',type:'button',onclick:async () => {
            if (!await xacNhan('Xóa bài viết?', '"' + b.tieu_de + '" sẽ bị xóa hẳn. Nếu chỉ muốn ẩn, hãy chọn Gỡ xuống.', 'Xóa bài')) return;
            A.baoLoi(''); const { error } = await db.from('bai_viet').delete().eq('id', b.id); if (error) A.baoLoi('Không xóa được bài viết.'); await tai(); }}, 'Xóa'));
      }) : [A.rong('Chưa có bài viết nào.')])));
  }
  function soan(b){
    const tde = el('input',{id:'b-t',maxlength:'150',placeholder:'Ví dụ: Lịch tiêm phòng cho chó con'}); tde.value = b ? b.tieu_de : '';
    const nhom = el('select',{id:'b-n'}, Object.entries(BV.NHOM).map(([k, v]) => el('option',{value:k}, v))); nhom.value = b ? b.nhom : 'cham_soc';
    const ts = el('textarea',{id:'b-s',rows:'2',maxlength:'300',placeholder:'Một hai câu hiện ở thẻ bài viết. Để trống thì web tự lấy đoạn đầu.'}); ts.value = b && b.tom_tat || '';
    const nd = el('textarea',{id:'b-nd',rows:'14',maxlength:'10000',placeholder:'Viết bình thường, cách nhau một dòng trống là sang đoạn mới.\n\n## Tiêu đề nhỏ\n- Một mục danh sách\n- Mục tiếp theo'}); nd.value = b ? b.noi_dung : '';
    const tg = el('input',{id:'b-tg',maxlength:'80',placeholder:'Để trống thì ghi ' + BV.TAC_GIA}); tg.value = b && b.tac_gia || '';
    const tt = el('select',{id:'b-tt'}, el('option',{value:'nhap'},'Nháp (chỉ quản trị xem)'), el('option',{value:'da_dang'},'Đã đăng')); tt.value = b ? b.trang_thai : 'nhap';
    A.hop(b ? 'Sửa bài viết' : 'Viết bài mới', 'Dòng bắt đầu bằng "## " là tiêu đề nhỏ, dòng bắt đầu bằng "- " là mục danh sách. Không dùng được HTML.',
      [A.o('b-t','Tiêu đề',tde), A.o('b-n','Nhóm',nhom), A.o('b-s','Tóm tắt (tối đa 300 ký tự)',ts), A.o('b-nd','Nội dung (tối đa 10.000 ký tự)',nd), A.o('b-tg','Tác giả',tg), A.o('b-tt','Trạng thái',tt)].map((f, i) => { if (i === 0 || i === 2 || i === 3) f.style.gridColumn = '1 / -1'; return f; }),
      b ? 'Lưu' : 'Tạo bài', async () => {
        if (!tde.value.trim()) return 'Vui lòng nhập tiêu đề.';
        if (!nd.value.trim()) return 'Vui lòng nhập nội dung.';
        const cot = { tieu_de: tde.value.trim(), nhom: nhom.value, tom_tat: ts.value.trim() || null, noi_dung: nd.value.trim(), tac_gia: tg.value.trim() || null, trang_thai: tt.value };
        const { error } = b ? await db.from('bai_viet').update(cot).eq('id', b.id) : await db.from('bai_viet').insert(cot);
        return error ? 'Không lưu được bài viết. Vui lòng kiểm tra lại.' : null; }, tai);
  }
  await tai();
})();
