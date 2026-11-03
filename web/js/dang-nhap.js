(function(){
  const { db, thuc, KHU, vaiTro } = Pethy;
  const $ = id => document.getElementById(id);
  Pethy.maSdt($('sdt'));
  Pethy.matKhau($('mat-khau')); Pethy.matKhau($('mat-khau-2'));
  // Dịch lỗi của Supabase sang câu dễ hiểu; phần mã lỗi gốc giữ lại trong ngoặc để dễ tra cứu.
  function loiDangKy(e){
    const m = String(e.message || ''), ma = e.code || e.status || '';
    let nd = 'Không tạo được tài khoản. Thử lại sau ít phút.';
    if (/already|registered|exists/i.test(m)) nd = 'Email này đã có tài khoản. Hãy đăng nhập.';
    else if (/captcha/i.test(m + ma)) nd = 'Ô kiểm tra "không phải robot" chưa hợp lệ hoặc đã hết hạn. Tải lại trang và thử lại.';
    else if (/rate|limit|too many|over_email/i.test(m + ma)) nd = 'Hệ thống đang giới hạn số thư xác nhận. Thử lại sau khoảng 1 giờ.';
    else if (/not authorized/i.test(m)) nd = 'Hệ thống thư chưa gửi được tới email này.';
    else if (/password/i.test(m)) nd = 'Mật khẩu chưa đủ mạnh. Dùng ít nhất 8 ký tự, có cả chữ và số.';
    else if (/invalid|valid email/i.test(m)) nd = 'Email chưa hợp lệ.';
    else if (/database|saving new user/i.test(m)) nd = 'Lỗi hệ thống khi lưu tài khoản. Báo cho phòng khám.';
    return nd + (ma ? ' (' + ma + ')' : '');
  }
  const cap = Pethy.captcha.gan($('captcha'));
  let dangKy = new URLSearchParams(location.search).has('dang-ky');

  let che = '';   // '' | 'quen' (xin liên kết) | 'dat' (đặt mật khẩu mới sau khi bấm liên kết trong thư)
  function hienChe(){
    $('tab-dn').setAttribute('aria-selected', String(!dangKy));
    $('tab-dk').setAttribute('aria-selected', String(dangKy));
    document.querySelectorAll('.dk').forEach(e => e.hidden = !dangKy);
    $('tieu-de').textContent = dangKy ? 'Tạo tài khoản' : 'Đăng nhập';
    $('gui').textContent = dangKy ? 'Tạo tài khoản' : 'Đăng nhập';
    $('mat-khau').autocomplete = dangKy ? 'new-password' : 'current-password';
    $('loi').hidden = $('thong-bao').hidden = true;
    $('mat-khau-2').value = '';
    const q = che === 'quen', d = che === 'dat';
    document.querySelector('.tab').style.display = (q || d) ? 'none' : ''; $('captcha').hidden = d;
    $('email').closest('.truong').hidden = d;
    $('mat-khau').closest('.truong').hidden = q;
    $('khoi-quen').hidden = dangKy || q || d;
    $('khoi-quay').hidden = !q;
    if (q) { $('tieu-de').textContent = 'Quên mật khẩu'; $('gui').textContent = 'Gửi liên kết đặt lại'; }
    if (d) { $('tieu-de').textContent = 'Đặt mật khẩu mới'; $('gui').textContent = 'Lưu mật khẩu';
      $('mat-khau').autocomplete = 'new-password'; $('mat-khau').placeholder = 'Mật khẩu mới, ít nhất 8 ký tự';
      document.querySelectorAll('.dk').forEach(e => e.hidden = !e.contains($('mat-khau-2'))); }
  }
  $('tab-dn').onclick = () => { dangKy = false; hienChe(); };
  $('tab-dk').onclick = () => { dangKy = true; hienChe(); };
  $('quen').onclick = () => { che = 'quen'; hienChe(); };
  $('quay').onclick = () => { che = ''; hienChe(); };
  hienChe();

  const loi = m => { $('loi').textContent = m; $('loi').hidden = false; $('thong-bao').hidden = true; };
  const tb = m => { $('thong-bao').textContent = m; $('thong-bao').hidden = false; $('loi').hidden = true; };

  // Đăng ký xong mà cần xác nhận email: thay biểu mẫu bằng màn chờ, xóa mật khẩu đã gõ, và tự đi tiếp khi người dùng đã bấm liên kết trong thư
  // (bấm ở tab khác của cùng trình duyệt thì phiên được chia sẻ nên tab này nhận ra).
  let choXn = false;
  function hienChoXacNhan(email){
    choXn = true;
    $('mat-khau').value = ''; $('mat-khau-2').value = '';
    $('form').hidden = true; document.querySelector('.tab').style.display = 'none';
    $('tieu-de').textContent = 'Kiểm tra email của bạn'; $('cx-email').textContent = email; $('cho-xac-nhan').hidden = false;
    $('ma-xn').value = ''; $('loi-ma').hidden = true; $('ma-xn').focus();
  }
  function boChoXacNhan(){ choXn = false; $('cho-xac-nhan').hidden = true; $('form').hidden = false; hienChe(); }
  $('cx-quay').onclick = boChoXacNhan;
  // Nhập mã xác nhận từ thư: xác minh ngay tại tab này, không cần mở liên kết.
  $('form-ma').addEventListener('submit', async ev => {
    ev.preventDefault();
    const ma = $('ma-xn').value.replace(/\s/g, ''), loiMa = m => { $('loi-ma').textContent = m; $('loi-ma').hidden = false; };
    if (!/^[0-9]{6,10}$/.test(ma)) { loiMa('Mã gồm 6 đến 10 chữ số, xem trong thư.'); return; }
    $('gui-ma').disabled = true; $('loi-ma').hidden = true;
    try {
      const { error } = await db.auth.verifyOtp({ email: $('cx-email').textContent, token: ma, type: 'signup' }).catch(e => ({ error: e }));
      if (error) { loiMa('Mã không đúng hoặc đã hết hạn. Kiểm tra lại mã trong thư mới nhất.'); return; }
      if (!choXn) return;
      choXn = false;
      if (await vaoKhu() === false) boChoXacNhan();
    } finally { $('gui-ma').disabled = false; }
  });
  async function tuDiTiep(){
    if (!choXn || !db) return;
    const { data } = await db.auth.getSession();
    if (!data || !data.session || !choXn) return;
    choXn = false;
    if (await vaoKhu() === false) boChoXacNhan();
  }
  if (db && thuc) {
    db.auth.onAuthStateChange(ev => { if (ev === 'SIGNED_IN') setTimeout(tuDiTiep, 0); });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) tuDiTiep(); });
  }

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
    // Khách bấm "Chọn dịch vụ" hoặc "Đặt với bác sĩ" ở trang chủ thì đăng nhập xong đi thẳng tới trang đặt lịch.
    let yDinh = false; try { const o = JSON.parse(localStorage.getItem('pethy_y_dinh') || 'null'); yDinh = !!(o && Date.now() - o.t < 7 * 864e5); } catch (_) {}
    location.href = vt === 'chu_nuoi' && yDinh ? '/chu-nuoi/dat-lich.html' : (KHU[vt] || '/');
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
    if (che === 'quen') {
      const mail = $('email').value.trim();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail)) { loi('Nhập email đã đăng ký tài khoản.'); return; }
      const tk = cap.lay();
      if (cap.bat && !tk) { loi('Vui lòng đợi ô kiểm tra "không phải robot" hoàn tất rồi thử lại.'); return; }
      $('gui').disabled = true;
      try {
        const { error } = await db.auth.resetPasswordForEmail(mail, { redirectTo: location.origin + '/dang-nhap.html', captchaToken: tk });
        if (error && /rate|limit|too many|over_email/i.test(error.message + (error.code || ''))) { loi('Hệ thống đang giới hạn số thư gửi đi. Thử lại sau khoảng 1 giờ.'); return; }
        if (error && /captcha/i.test(error.message)) { loi('Ô kiểm tra chưa hợp lệ hoặc đã hết hạn. Tải lại trang và thử lại.'); return; }
        if (error) { loi('Chưa gửi được thư đặt lại mật khẩu. Vui lòng liên hệ phòng khám để được hỗ trợ.' + (error.code ? ' (' + error.code + ')' : '')); return; }
        // Cố ý dùng một thông báo chung dù email có tồn tại hay không, để không lộ email nào đã đăng ký.
        tb('Nếu email này đã có tài khoản, một liên kết đặt lại mật khẩu vừa được gửi. Hãy kiểm tra cả thư rác.');
      } finally { $('gui').disabled = false; cap.moi(); }
      return;
    }
    if (che === 'dat') {
      const mk1 = $('mat-khau').value;
      if (mk1.length < 8) { loi('Mật khẩu mới tối thiểu 8 ký tự.'); return; }
      if ($('mat-khau-2').value !== mk1) { loi('Hai mật khẩu chưa giống nhau. Nhập lại cho khớp.'); return; }
      $('gui').disabled = true;
      try {
        const { error } = await db.auth.updateUser({ password: mk1 });
        if (error) { loi(/same|different/i.test(error.message) ? 'Mật khẩu mới phải khác mật khẩu cũ.' : /password/i.test(error.message) ? 'Mật khẩu chưa đủ mạnh. Dùng ít nhất 8 ký tự, có cả chữ và số.' : 'Không đổi được mật khẩu. Liên kết có thể đã hết hạn, hãy xin liên kết mới.'); return; }
        await db.auth.signOut();
        che = ''; hienChe(); $('mat-khau').value = '';
        tb('Đã đổi mật khẩu. Hãy đăng nhập bằng mật khẩu mới.');
      } finally { $('gui').disabled = false; }
      return;
    }
    const email = $('email').value.trim(), mk = $('mat-khau').value;
    if (!email || mk.length < 8) { loi('Nhập email và mật khẩu (tối thiểu 8 ký tự).'); return; }
    const captchaToken = cap.lay();
    if (cap.bat && !captchaToken) { loi('Vui lòng đợi ô kiểm tra "không phải robot" hoàn tất rồi thử lại.'); return; }
    $('gui').disabled = true;
    try {
      if (dangKy) {
        const ten = $('ho-ten').value.trim(), sdt = $('sdt').value.replace(/\s/g, '');
        if (!ten) { loi('Vui lòng nhập họ tên.'); return; }
        if ($('mat-khau-2').value !== mk) { loi('Hai mật khẩu chưa giống nhau. Nhập lại cho khớp.'); $('mat-khau-2').focus(); return; }
        if (!/^(\+84|0)[0-9]{9}$/.test(sdt)) { loi('Số điện thoại chưa hợp lệ (ví dụ 0901234567).'); return; }
        const { data, error } = await db.auth.signUp({ email, password: mk, options: { captchaToken, data: { ho_ten: ten, so_dien_thoai: sdt } } });
        if (error) { loi(loiDangKy(error)); return; }
        if (data.session) await vaoKhu(); else hienChoXacNhan(email);
      } else {
        const { error } = await db.auth.signInWithPassword({ email, password: mk, options: { captchaToken } });
        if (error) { loi('Email hoặc mật khẩu không đúng.'); return; }   // một thông báo chung, không lộ email nào tồn tại
        await vaoKhu();
      }
    } finally { $('gui').disabled = false; cap.moi(); }
  });
  // Quay lại từ liên kết trong thư: mã nằm trong phần # của địa chỉ.
  (async function tuLienKetThu(){
    const h = new URLSearchParams(location.hash.replace(/^#/, ''));
    if (!h.get('type') && !h.get('error_code')) return;
    history.replaceState(null, '', location.pathname);
    if (h.get('error_code') || h.get('error')) { che = 'quen'; hienChe(); loi('Liên kết đã hết hạn hoặc đã dùng rồi. Nhập email để nhận liên kết mới.'); return; }
    if (!thuc) return;
    // Liên kết xác nhận đăng ký: tạo phiên từ mã trong liên kết rồi vào khu. Tab đã dùng để đăng ký (đang chờ xác nhận) nhận sự kiện đăng nhập và tự vào khu theo.
    if (h.get('type') === 'signup') {
      // setSession ném ngoại lệ (không trả lỗi) khi mã trong liên kết không phải JWT, ví dụ thư bị cắt cụt, nên phải bắt cả hai trường hợp.
      const dn = await db.auth.setSession({ access_token: h.get('access_token'), refresh_token: h.get('refresh_token') }).catch(e => ({ error: e }));
      if (dn.error) { loi('Liên kết xác nhận không hợp lệ hoặc đã dùng rồi. Hãy đăng nhập bằng email và mật khẩu bạn đã đăng ký.'); return; }
      tb('Đã xác nhận email. Đang đưa bạn vào hệ thống…');
      if (await vaoKhu() === false) return;
      return;
    }
    if (h.get('type') !== 'recovery') return;
    const { error } = await db.auth.setSession({ access_token: h.get('access_token'), refresh_token: h.get('refresh_token') }).catch(e => ({ error: e }));
    if (error) { che = 'quen'; hienChe(); loi('Liên kết không hợp lệ. Nhập email để nhận liên kết mới.'); return; }
    che = 'dat'; hienChe();
  })();
  if (new URLSearchParams(location.search).has('het-phien')) tb('Phiên đăng nhập đã kết thúc do lâu không thao tác. Vui lòng đăng nhập lại.');
})();
