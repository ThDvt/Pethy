// Cấu hình công khai. URL và khóa "anon" của Supabase được phép nằm ở đây
// (bảo mật dựa vào RLS, xem docs/thiet-ke-bao-mat.md).
// TUYỆT ĐỐI KHÔNG đặt khóa "service_role" hoặc mật khẩu vào bất kỳ tệp nào trong thư mục web.
window.PETHY_CONFIG = {
  SUPABASE_URL: "https://xxspygmpbbfzifiyulpr.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4c3B5Z21wYmJmemlmaXl1bHByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIzNjA5NzMsImV4cCI6MjEwNzkzNjk3M30.8JScAUylhMciS--vzHnQfn5-SV8BBphcBPwZOnpl57Y",   // khóa anon (public), role đã kiểm tra là "anon",
  // Khóa công khai (site key) của Cloudflare Turnstile. Để trống thì chưa bật ô kiểm tra "không phải robot".
  TURNSTILE_SITE_KEY: ""
};
