(async function(){
  const { db, el, xacNhan } = Pethy, A = Pethy.admin, $ = A.$, BV = Pethy.baiViet;
  if (!await A.boot('/admin/bai-viet.html')) return;
  const COT = 'id,tieu_de,nhom,tom_tat,noi_dung,tac_gia,anh_bia,trang_thai,ngay_dang,created_at';
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
            A.baoLoi(''); const { error } = await db.from('bai_viet').delete().eq('id', b.id); if (error) A.baoLoi('Không xóa được bài viết.'); else await xoaTep(b.anh_bia); await tai(); }}, 'Xóa'));
      }) : [A.rong('Chưa có bài viết nào.')])));
  }
  const xoaTep = async url => { const d = BV.duongBia(url); if (d) { try { await db.storage.from(BV.KHO).remove([d]); } catch (e) {} } };
  function soan(b){
    // Ảnh bìa: chọn ảnh thì xem trước ngay, chỉ tải lên khi bấm Lưu.
    const cu = b && b.anh_bia || null; let anhMoi = null, bo = false;
    const xem = el('div',{style:'width:100%;aspect-ratio:16/9;border:1px solid var(--muc);display:flex;align-items:center;justify-content:center;overflow:hidden;background:var(--kem2)'});
    const ve = src => xem.replaceChildren(src ? el('img',{src,alt:'Ảnh bìa',style:'width:100%;height:100%;object-fit:cover'}) : el('span',{class:'nho'},'Chưa có ảnh bìa'));
    ve(cu);
    const tep = el('input',{id:'b-anh',type:'file',accept:'image/jpeg,image/png,image/webp',style:'display:none'});
    const loiAnh = el('div',{class:'loi',role:'alert',hidden:true});
    const nutBo = el('button',{class:'lien-ket',type:'button',style:'white-space:nowrap',hidden:!cu,onclick:() => { anhMoi = null; bo = true; ve(null); nutBo.hidden = true; tep.value = ''; }}, 'Gỡ ảnh');
    tep.addEventListener('change', async () => {
      loiAnh.hidden = true; const f = tep.files && tep.files[0]; if (!f) return;
      try { anhMoi = await BV.chuanHoaBia(f); bo = false; ve(anhMoi.xem); nutBo.hidden = false; }
      catch (e) { loiAnh.textContent = e.message; loiAnh.hidden = false; tep.value = ''; }
    });
    const khungAnh = el('div',{class:'truong'}, el('div',{class:'nho',style:'margin-bottom:6px'}, 'Ảnh bìa (không bắt buộc)'), xem,
      el('div',{style:'display:flex;gap:16px;align-items:center;margin-top:8px'}, el('button',{class:'nut',type:'button',style:'white-space:nowrap',onclick:() => tep.click()}, 'Chọn ảnh'), nutBo,
        el('span',{class:'nho'},'Ảnh ngang tỉ lệ 16:9 là đẹp nhất. Web tự cắt giữa ảnh và thu nhỏ.')), tep, loiAnh);
    khungAnh.style.flexBasis = '100%';
    const tde = el('input',{id:'b-t',maxlength:'150',placeholder:'Ví dụ: Lịch tiêm phòng cho chó con'}); tde.value = b ? b.tieu_de : '';
    const nhom = el('select',{id:'b-n'}, Object.entries(BV.NHOM).map(([k, v]) => el('option',{value:k}, v))); nhom.value = b ? b.nhom : 'cham_soc';
    const ts = el('textarea',{id:'b-s',rows:'2',maxlength:'300',placeholder:'Một hai câu hiện ở thẻ bài viết. Để trống thì web tự lấy đoạn đầu.'}); ts.value = b && b.tom_tat || '';
    const nd = el('textarea',{id:'b-nd',rows:'14',maxlength:'10000',placeholder:'Viết bình thường, cách nhau một dòng trống là sang đoạn mới.\n\n## Tiêu đề nhỏ\n- Một mục danh sách\n- Mục tiếp theo'}); nd.value = b ? b.noi_dung : '';
    const tg = el('input',{id:'b-tg',maxlength:'80',placeholder:'Để trống thì ghi ' + BV.TAC_GIA}); tg.value = b && b.tac_gia || '';
    const tt = el('select',{id:'b-tt'}, el('option',{value:'nhap'},'Nháp (chỉ quản trị xem)'), el('option',{value:'da_dang'},'Đã đăng')); tt.value = b ? b.trang_thai : 'nhap';
    A.hop(b ? 'Sửa bài viết' : 'Viết bài mới', 'Dòng bắt đầu bằng "## " là tiêu đề nhỏ, dòng bắt đầu bằng "- " là mục danh sách. Không dùng được HTML.',
      [A.o('b-t','Tiêu đề',tde), khungAnh, A.o('b-n','Nhóm',nhom), A.o('b-s','Tóm tắt (tối đa 300 ký tự)',ts), A.o('b-nd','Nội dung (tối đa 10.000 ký tự)',nd), A.o('b-tg','Tác giả',tg), A.o('b-tt','Trạng thái',tt)]
        .map((f, i) => { if ([0, 1, 3, 4].includes(i)) f.style.flexBasis = '100%'; return f; }),
      b ? 'Lưu' : 'Tạo bài', async () => {
        if (!tde.value.trim()) return 'Vui lòng nhập tiêu đề.';
        if (!nd.value.trim()) return 'Vui lòng nhập nội dung.';
        const cot = { tieu_de: tde.value.trim(), nhom: nhom.value, tom_tat: ts.value.trim() || null, noi_dung: nd.value.trim(), tac_gia: tg.value.trim() || null, trang_thai: tt.value };
        let duongMoi = null;
        if (anhMoi) {
          duongMoi = 'bia-' + Date.now() + '.' + anhMoi.duoi;
          const up = await db.storage.from(BV.KHO).upload(duongMoi, anhMoi.blob, { contentType: anhMoi.blob.type, cacheControl: '31536000', upsert: false });
          if (up.error) return /bucket/i.test(up.error.message || '') ? 'Chưa có kho ảnh. Chạy db/10_bai_viet.sql (hoặc db/04_storage.sql) trong Supabase rồi thử lại.' : 'Không tải được ảnh lên. Thử ảnh khác hoặc thử lại sau.';
          cot.anh_bia = db.storage.from(BV.KHO).getPublicUrl(duongMoi).data.publicUrl;
        } else if (bo) cot.anh_bia = null;
        const { error } = b ? await db.from('bai_viet').update(cot).eq('id', b.id) : await db.from('bai_viet').insert(cot);
        if (error) { if (duongMoi) await xoaTep(cot.anh_bia); return 'Không lưu được bài viết. Vui lòng kiểm tra lại.'; }
        if (cu && (anhMoi || bo)) await xoaTep(cu);
        return null; }, tai);
  }
  await tai();
})();
