// Cloudflare Turnstile: ô kiểm tra "không phải robot", dùng chung cho đăng ký và đăng nhập.
// Chỉ bật khi PETHY_CONFIG.TURNSTILE_SITE_KEY có giá trị; để trống thì mọi hàm trở thành no-op.
// Khóa bí mật (secret key) chỉ dán vào Supabase (Authentication, Attack Protection), không bao giờ để ở đây.
(function(){
  const khoa = (window.PETHY_CONFIG || {}).TURNSTILE_SITE_KEY;
  const bat = !!khoa && !/[?&]mau=1/.test(location.search);
  let tai = null;
  const napThuVien = () => tai || (tai = new Promise((ok, hong) => {
    const s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    s.async = true; s.onload = ok; s.onerror = () => hong(new Error('turnstile'));
    document.head.appendChild(s);
  }));
  // gan(khung): vẽ ô kiểm tra vào phần tử khung, trả về { lay(), moi() }.
  // lay() trả mã dùng một lần (hoặc undefined khi tắt); moi() xin mã mới sau mỗi lần gửi.
  function gan(khung){
    if (!bat || !khung) return { bat: false, lay: () => undefined, moi(){} };
    let ma = '', id = null;
    napThuVien().then(() => {
      id = window.turnstile.render(khung, {
        sitekey: khoa, language: 'vi', theme: 'light', size: 'flexible',
        callback: t => { ma = t; }, 'expired-callback': () => { ma = ''; }, 'error-callback': () => { ma = ''; }
      });
    }).catch(() => {});
    return {
      bat: true,
      lay: () => ma || null,
      moi(){ ma = ''; if (id !== null && window.turnstile) window.turnstile.reset(id); }
    };
  }
  window.Pethy = window.Pethy || {};
  window.Pethy.captcha = { bat, gan };
})();
