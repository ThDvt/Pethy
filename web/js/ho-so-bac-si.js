// Hộp thoại hồ sơ công khai của bác sĩ (ảnh, chuyên môn, giới thiệu). Dùng cho admin (sửa hộ) và chính bác sĩ.
// Cần admin.js (A.hop, A.o) và hộp thoại #hop trong trang.
(function(){
  const { db, el } = Pethy, A = Pethy.admin;
  // Ảnh đại diện bác sĩ: cắt vuông giữa ảnh, thu về 360 px, nén WebP (hoặc JPEG) để nhẹ và đồng đều, rồi tải lên kho ảnh công khai.
  const KHO_ANH = 'avatar-bac-si';
  async function chuanHoaAnh(file){
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error('Chỉ nhận ảnh JPG, PNG hoặc WebP.');
    if (file.size > 12 * 1024 * 1024) throw new Error('Ảnh quá lớn (tối đa 12 MB).');
    const bm = await createImageBitmap(file).catch(() => { throw new Error('Không đọc được ảnh này.'); });
    const canh = Math.min(bm.width, bm.height), N = 360;
    const cv = document.createElement('canvas'); cv.width = cv.height = N;
    cv.getContext('2d').drawImage(bm, (bm.width - canh) / 2, (bm.height - canh) / 2, canh, canh, 0, 0, N, N);
    const blob = await new Promise(ok => cv.toBlob(ok, 'image/webp', 0.85));
    const b = (blob && blob.type === 'image/webp') ? blob : await new Promise(ok => cv.toBlob(ok, 'image/jpeg', 0.88));
    const url = await new Promise(ok => { const f = new FileReader(); f.onload = () => ok(f.result); f.readAsDataURL(b); });
    return { blob: b, xem: url, duoi: b.type === 'image/webp' ? 'webp' : 'jpg' };
  }
  const duongCu = url => { const k = '/' + KHO_ANH + '/'; const i = url ? url.indexOf(k) : -1; return i < 0 ? null : decodeURIComponent(url.slice(i + k.length).split('?')[0]); };
  const chuCai = ten => (String(ten).trim().split(/\s+/).pop() || '?').charAt(0).toUpperCase();

  // Hồ sơ công khai của bác sĩ (hiện ở trang chủ): ảnh, chuyên môn và giới thiệu.
  async function hoSoBs(tk, lamMoi){
    const r = await db.from('ho_so_bac_si').select('chuyen_mon,gioi_thieu,anh_dai_dien').eq('tai_khoan_id', tk.id).maybeSingle();
    if (r.error) return A.baoLoi('Không đọc được hồ sơ bác sĩ.');
    const cu = (r.data && r.data.anh_dai_dien) || null;
    let anhMoi = null, xoaAnh = false;
    const khungAnh = el('div',{style:'flex:0 0 88px;width:88px;height:88px;border-radius:50%;border:1px solid var(--muc);overflow:hidden;display:flex;align-items:center;justify-content:center;font:800 34px var(--chu);background:var(--nen)'});
    const ve = src => { khungAnh.replaceChildren(src ? el('img',{src,alt:'Ảnh đại diện của ' + tk.ho_ten,style:'width:100%;height:100%;object-fit:cover'}) : el('span',{'aria-hidden':'true'}, chuCai(tk.ho_ten))); };
    ve(cu);
    const tep = el('input',{id:'bs-anh',type:'file',accept:'image/jpeg,image/png,image/webp',style:'display:none'});
    const goiY = el('div',{class:'nho'}, 'Ảnh vuông, rõ mặt, nền gọn. Hệ thống tự cắt vuông và thu nhỏ.');
    const loiAnh = el('div',{class:'loi',role:'alert',hidden:true});
    const nutXoa = el('button',{class:'lien-ket',type:'button',hidden:!cu,onclick:() => { anhMoi = null; xoaAnh = true; ve(null); nutXoa.hidden = true; tep.value = ''; }}, 'Gỡ ảnh');
    tep.addEventListener('change', async () => {
      loiAnh.hidden = true; const f = tep.files && tep.files[0]; if (!f) return;
      try { anhMoi = await chuanHoaAnh(f); xoaAnh = false; ve(anhMoi.xem); nutXoa.hidden = false; }
      catch (e) { loiAnh.textContent = e.message; loiAnh.hidden = false; tep.value = ''; }
    });
    const dongAnh = el('div',{style:'display:flex;gap:16px;align-items:center'}, khungAnh,
      el('div',{style:'display:flex;flex-direction:column;gap:6px;align-items:flex-start'},
        el('button',{class:'nut',type:'button',onclick:() => tep.click()}, 'Chọn ảnh'), nutXoa, goiY));
    const cm = el('input',{id:'bs-cm',type:'text',maxlength:'120',placeholder:'Ví dụ: Nội khoa chó mèo'}); cm.value = (r.data && r.data.chuyen_mon) || '';
    const gt = el('textarea',{id:'bs-gt',rows:'5',maxlength:'600',placeholder:'Ví dụ: Hơn 8 năm khám và điều trị nội khoa cho chó mèo.'}); gt.value = (r.data && r.data.gioi_thieu) || '';
    A.hop('Hồ sơ Bs. ' + tk.ho_ten, 'Khách xem thông tin này khi bấm "Xem thông tin" ở trang chủ.',
      [el('div',{class:'truong'}, el('div',{class:'nho',style:'margin-bottom:6px'}, 'Ảnh đại diện'), dongAnh, tep, loiAnh), A.o('bs-cm','Chuyên môn',cm), A.o('bs-gt','Giới thiệu (tối đa 600 ký tự)',gt)], 'Lưu hồ sơ', async () => {
      const cot = { chuyen_mon: cm.value.trim() || null, gioi_thieu: gt.value.trim() || null };
      let duongMoi = null;
      if (anhMoi) {
        duongMoi = tk.id + '/avatar-' + Date.now() + '.' + anhMoi.duoi;
        const up = await db.storage.from(KHO_ANH).upload(duongMoi, anhMoi.blob, { contentType: anhMoi.blob.type, cacheControl: '31536000', upsert: false });
        if (up.error) return /bucket/i.test(up.error.message || '') ? 'Chưa có kho ảnh. Chạy db/04_storage.sql trong Supabase rồi thử lại.' : 'Không tải được ảnh lên. Thử ảnh khác hoặc thử lại sau.';
        cot.anh_dai_dien = db.storage.from(KHO_ANH).getPublicUrl(duongMoi).data.publicUrl;
      } else if (xoaAnh) cot.anh_dai_dien = null;
      const { error } = await db.from('ho_so_bac_si').update(cot).eq('tai_khoan_id', tk.id);
      if (error) { if (duongMoi) await db.storage.from(KHO_ANH).remove([duongMoi]); return 'Không lưu được hồ sơ.'; }
      const cuDuong = duongCu(cu);
      if (cuDuong && (anhMoi || xoaAnh)) { try { await db.storage.from(KHO_ANH).remove([cuDuong]); } catch (e) {} }
      return null; }, lamMoi);
  }
  // tk: { id, ho_ten }; lamMoi: gọi sau khi lưu xong.
  Pethy.hoSoBacSi = { mo: hoSoBs };
})();
