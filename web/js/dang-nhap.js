(function(){
  const { db, thuc, KHU, vaiTro } = Pethy;
  const $ = id => document.getElementById(id);
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

  async function vaoKhu(){
    const vt = await vaiTro();
    if (!vt) { loi('Hệ thống đang bảo trì hoặc tài khoản chưa được kích hoạt.'); await db.auth.signOut(); return; }
    location.href = KHU[vt] || '/';
  }

  $('form').addEventListener('submit', async ev => {
    ev.preventDefault();
    if (!thuc) { loi('Chưa cấu hình Supabase (js/config.js).'); return; }
    const email = $('email').value.trim(), mk = $('mat-khau').value;
    if (!email || mk.length < 8) { loi('Nhập email và mật khẩu (tối thiểu 8 ký tự).'); return; }
    $('gui').disabled = true;
    try {
      if (dangKy) {
        const ten = $('ho-ten').value.trim(), sdt = $('sdt').value.trim();
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
})();
