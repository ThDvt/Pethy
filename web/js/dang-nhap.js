(function(){
  const { db, thuc, KHU, vaiTro } = Pethy;
  const $ = id => document.getElementById(id);
  Pethy.maSdt($('sdt'));
  let dangKy = new URLSearchParams(location.search).has('dang-ky');

  function hienChe(){
    $('tab-dn').setAttribute('aria-selected', String(!dangKy));
    $('tab-dk').setAttribute('aria-selected', String(dangKy));
    document.querySelectorAll('.dk').forEach(e => e.hidden = !dangKy);
    $('tieu-de').textContent = dangKy ? 'Tạo tài khoản' : 'Đăng nhập';
    $('gui').textContent = dangKy ? 'Tạo tài khoản' : 'Đăng nhập';
    $('mat-khau').autocomplete = dangKy ? 'new-password' : 'current-password';
    $('loi').hidden = $('thong-bao').hidden = true;
  }
  $('tab-dn').onclick = () => { dangKy = false; hienChe(); };
  $('tab-dk').onclick = () => { dangKy = true; hienChe(); };
  hienChe();

  const loi = m => { $('loi').textContent = m; $('loi').hidden = false; $('thong-bao').hidden = true; };
  const tb = m => { $('thong-bao').textContent = m; $('thong-bao').hidden = false; $('loi').hidden = true; };

  let cho2fa = null;   // factorId đang chờ nhập mã
  async function vaoKhu(){
    // Tài khoản có xác thực hai lớp: phải nhập mã trước khi được cấp vai trò.
    const a = await db.auth.mfa.getAuthenticatorAssuranceLevel();
    if (!a.error && a.data.nextLevel === 'aal2' && a.data.currentLevel !== 'aal2') {
      const f = await db.auth.mfa.listFactors();
      const tot = f.data && f.data.totp && f.data.totp[0];
      if (!tot) { loi('Không đọc được yếu tố xác thực. Vui lòng thử lại.'); await db.auth.signOut(); return false; }
      cho2fa = tot.id; $('khoi-2fa').hidden = false; $('ma-2fa').focus();
      $('gui').textContent = 'Xác nhận mã'; tb('Nhập mã 6 số trong ứng dụng xác thực của bạn.');
      return false;
    }
    const vt = await vaiTro();
    if (!vt) { loi('Hệ thống đang bảo trì hoặc tài khoản chưa được kích hoạt.'); await db.auth.signOut(); return; }
    location.href = KHU[vt] || '/';
    return true;
  }

  $('form').addEventListener('submit', async ev => {
    ev.preventDefault();
    if (!thuc) { loi('Chưa cấu hình Supabase (js/config.js).'); return; }
    if (cho2fa) {
      const ma = $('ma-2fa').value.trim();
      if (!/^[0-9]{6}$/.test(ma)) { loi('Mã gồm đúng 6 chữ số.'); return; }
      $('gui').disabled = true;
      try {
        const { error } = await db.auth.mfa.challengeAndVerify({ factorId: cho2fa, code: ma });
        if (error) { loi('Mã không đúng hoặc đã hết hạn. Thử mã mới.'); $('ma-2fa').value = ''; return; }
        await vaoKhu();
      } finally { $('gui').disabled = false; }
      return;
    }
    const email = $('email').value.trim(), mk = $('mat-khau').value;
    if (!email || mk.length < 8) { loi('Nhập email và mật khẩu (tối thiểu 8 ký tự).'); return; }
    $('gui').disabled = true;
    try {
      if (dangKy) {
        const ten = $('ho-ten').value.trim(), sdt = $('sdt').value.replace(/\s/g, '');
        if (!ten) { loi('Vui lòng nhập họ tên.'); return; }
        if (!/^(\+84|0)[0-9]{9}$/.test(sdt)) { loi('Số điện thoại chưa hợp lệ (ví dụ 0901234567).'); return; }
        const { data, error } = await db.auth.signUp({ email, password: mk, options: { data: { ho_ten: ten, so_dien_thoai: sdt } } });
        if (error) { loi('Không tạo được tài khoản. Kiểm tra lại thông tin hoặc thử lại sau.'); return; }
        if (data.session) await vaoKhu(); else tb('Đã gửi email xác nhận. Mở email và bấm liên kết, rồi quay lại đăng nhập.');
      } else {
        const { error } = await db.auth.signInWithPassword({ email, password: mk });
        if (error) { loi('Email hoặc mật khẩu không đúng.'); return; }   // một thông báo chung, không lộ email nào tồn tại
        await vaoKhu();
      }
    } finally { $('gui').disabled = false; }
  });
  if (new URLSearchParams(location.search).has('het-phien')) tb('Phiên đăng nhập đã kết thúc do lâu không thao tác. Vui lòng đăng nhập lại.');
})();
