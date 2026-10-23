// Kiểm tra cấu hình Supabase đang thực sự áp dụng (đọc /auth/v1/settings công khai và thử một truy vấn dữ liệu).
(async function(){
  const { db, el } = Pethy, A = Pethy.admin;
  if (!document.getElementById('vung')) return;
  const cfg = window.PETHY_CONFIG || {};
  const mau = location.search.includes('mau=1');
  const khung = el('section',{style:'margin-top:40px'});
  document.getElementById('vung').after(khung);

  async function docCauHinh(){
    if (mau) return { external:{ email:true }, disable_signup:false, mailer_autoconfirm:true };
    const r = await fetch(cfg.SUPABASE_URL + '/auth/v1/settings', { headers:{ apikey: cfg.SUPABASE_ANON_KEY } });
    if (!r.ok) throw new Error('http ' + r.status);
    return r.json();
  }
  const dong = (ok, ten, ghiChu) => el('div',{class:'hang'},
    el('div',{class:'ten'}, ten, el('div',{class:'nho',style:'font-weight:400'}, ghiChu)),
    el('span',{class:'tt' + (ok === true ? '' : ok === 'luu-y' ? ' vang' : ' do')}, ok === true ? 'Đạt' : ok === 'luu-y' ? 'Lưu ý' : 'Chưa đạt'));

  async function chay(ev){
    if (ev) ev.currentTarget.disabled = true;
    khung.replaceChildren(el('h2',{style:'font-size:20px;margin:0 0 4px'}, 'Kiểm tra cấu hình Supabase'), el('p',{class:'trang-thai-tai',role:'status'}, 'Đang kiểm tra…'));
    const hang = [];
    try {
      const s = await docCauHinh();
      hang.push(dong(!!(s.external && s.external.email), 'Đăng nhập bằng email đang bật',
        'Nếu chưa đạt: Authentication → Sign In / Providers → Email → bật Enable email provider, rồi Save.'));
      hang.push(dong(!s.disable_signup, 'Cho phép đăng ký tài khoản mới', 'Nếu chưa đạt: bật Allow new users to sign up.'));
      hang.push(dong(s.mailer_autoconfirm ? true : 'luu-y', s.mailer_autoconfirm ? 'Đăng ký không cần xác nhận email' : 'Đang yêu cầu xác nhận email',
        s.mailer_autoconfirm ? 'Phù hợp với phòng khám nhỏ.' : 'Gói Free chỉ gửi khoảng 2 thư mỗi giờ và có thể không gửi được tới email trường. Nên tắt Confirm email.'));
    } catch (e) {
      hang.push(dong(false, 'Không đọc được cấu hình Supabase', 'Dự án có thể đang tạm ngưng (gói Free ngưng sau khoảng 7 ngày không dùng). Vào Supabase bấm Restore.'));
    }
    const t = await db.from('dich_vu').select('id').limit(1);
    hang.push(dong(!t.error, 'Truy vấn dữ liệu hoạt động', t.error ? 'Chưa đọc được bảng dữ liệu. Kiểm tra đã chạy đủ các tệp SQL trong thư mục db.' : 'Cơ sở dữ liệu và phân quyền trả lời bình thường.'));
    khung.replaceChildren(el('h2',{style:'font-size:20px;margin:0 0 4px'}, 'Kiểm tra cấu hình Supabase'),
      el('div',{class:'nho',style:'margin-bottom:8px'}, 'Đọc cấu hình đang thực sự áp dụng trên Supabase, dùng khi đăng ký hoặc đăng nhập bị lỗi.'),
      el('div',{style:'border-top:2px solid var(--muc)'}, ...hang),
      el('button',{class:'nut phu',type:'button',style:'margin-top:16px',onclick:chay}, 'Kiểm tra lại'));
  }
  chay();
})();
