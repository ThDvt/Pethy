(async function(){
  const { db, el } = Pethy, A = Pethy.admin, $ = A.$;
  if (!await A.boot('/admin/bao-mat.html')) return;
  async function tai(){
    A.baoLoi('');
    const f = await db.auth.mfa.listFactors();
    if (f.error) return A.baoLoi('Không đọc được trạng thái xác thực hai lớp.');
    const ok = (f.data.totp || [])[0];
    if (ok) {
      $('vung').replaceChildren(
        el('div',{style:'margin-top:20px;border-top:2px solid var(--muc);padding-top:16px'},
          el('span',{class:'tt'}, 'Đang bật'),
          el('p',{style:'margin:12px 0 0'}, 'Mỗi lần đăng nhập, tài khoản quản trị phải nhập mã 6 số từ ứng dụng xác thực. Máy chủ cũng từ chối quyền quản trị với phiên chưa nhập mã.'),
          el('p',{class:'nho',style:'margin:8px 0 16px'}, 'Nếu mất điện thoại, gỡ yếu tố bằng SQL Editor của Supabase (xem db/05_mfa_admin.sql).'),
          el('button',{class:'lien-ket',type:'button',style:'color:var(--loi)',onclick:async () => {
            if (!await Pethy.xacNhan('Tắt xác thực hai lớp?', 'Tài khoản chỉ còn được bảo vệ bằng mật khẩu.', 'Tắt xác thực')) return;
            const { error } = await db.auth.mfa.unenroll({ factorId: ok.id });
            if (error) return A.baoLoi('Không tắt được. Hãy đăng nhập lại để nhập mã rồi thử lại.');
            await tai(); }}, 'Tắt xác thực hai lớp')));
      return;
    }
    $('vung').replaceChildren(el('div',{style:'margin-top:20px;border-top:2px solid var(--muc);padding-top:16px'},
      el('span',{class:'tt do'}, 'Chưa bật'),
      el('p',{style:'margin:12px 0 16px'}, 'Cần một ứng dụng xác thực trên điện thoại (Google Authenticator, Microsoft Authenticator, Authy...).'),
      el('button',{class:'nut chinh',type:'button',onclick:batDau}, 'Bật xác thực hai lớp')));
  }
  async function batDau(ev){
    ev.currentTarget.disabled = true; A.baoLoi('');
    // Xóa các yếu tố dở dang (chưa xác minh) từ lần thử trước.
    const f = await db.auth.mfa.listFactors();
    for (const x of (f.data && f.data.all) || []) if (x.status === 'unverified') await db.auth.mfa.unenroll({ factorId: x.id });
    const r = await db.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Pethy quản trị' });
    if (r.error) { ev.currentTarget.disabled = false; return A.baoLoi('Không tạo được mã QR. Vui lòng thử lại.'); }
    const ma = el('input',{id:'ma',placeholder:'6 số',inputmode:'numeric',maxlength:'6',autocomplete:'one-time-code',style:'max-width:160px;font-family:var(--so);font-size:22px;letter-spacing:.2em'});
    const qr = el('img',{alt:'Mã QR để thêm vào ứng dụng xác thực',width:'200',height:'200',src:r.data.totp.qr_code,style:'display:block;border:1px solid var(--vach);background:#fff'});
    $('vung').replaceChildren(el('div',{style:'margin-top:20px;border-top:2px solid var(--muc);padding-top:16px;max-width:460px'},
      el('ol',{style:'padding-left:20px;line-height:1.7;margin:0 0 16px'},
        el('li',{}, 'Mở ứng dụng xác thực, chọn thêm tài khoản, quét mã QR dưới đây.'),
        el('li',{}, 'Nhập mã 6 số hiện trong ứng dụng vào ô bên dưới và bấm Xác nhận.')),
      qr, el('p',{class:'nho',style:'margin:8px 0 16px'}, 'Không quét được? Nhập tay khóa: ', el('span',{class:'so'}, r.data.totp.secret)),
      el('div',{class:'truong'}, el('label',{for:'ma'}, 'Mã 6 số'), ma),
      el('button',{class:'nut chinh',type:'button',onclick:async b => {
        const v = ma.value.trim(); if (!/^[0-9]{6}$/.test(v)) return A.baoLoi('Mã gồm đúng 6 chữ số.');
        b.currentTarget.disabled = true;
        const { error } = await db.auth.mfa.challengeAndVerify({ factorId: r.data.id, code: v });
        if (error) { b.currentTarget.disabled = false; return A.baoLoi('Mã không đúng hoặc đã hết hạn. Thử mã mới trong ứng dụng.'); }
        await tai(); }}, 'Xác nhận')));
  }
  await tai();
})();
