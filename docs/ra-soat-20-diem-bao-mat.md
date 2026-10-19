# Rà soát 20 điểm kiểm tra bảo mật (19/10/2026)

Căn cứ: đọc mã nguồn trong `web/` và `db/`, kết quả tự tấn công bằng khóa anon trên Supabase thật (không mục nào bị lộ), và trang giá chính thức của Supabase. Chưa kiểm tra được trực tiếp cấu hình trên bảng điều khiển Supabase và Cloudflare vì chưa triển khai.

Mức: Đạt, Chờ kiểm tra sau khi triển khai, Một phần, Chưa.

| # | Điểm kiểm tra | Mức | Hiện trạng |
|---|---|---|---|
| 1 | Hash mật khẩu bằng Argon2 hoặc bcrypt | Đạt | Mật khẩu do Supabase Auth giữ (theo tài liệu Supabase dùng bcrypt). Cơ sở dữ liệu của dự án không có cột mật khẩu nào, giao diện không tự xử lý mật khẩu |
| 2 | Giới hạn tần suất đăng nhập | Một phần | Có giới hạn mặc định của Supabase Auth. Chưa bật CAPTCHA Turnstile, chưa đặt luật giới hạn trên Cloudflare |
| 3 | Phiên hết hạn | Một phần | Token truy cập ngắn hạn tự làm mới; có nút đăng xuất. Hết phiên theo thời gian không hoạt động là tính năng gói Pro ("Session timeouts: Not included" ở gói Free). Chưa có tự đăng xuất khi không thao tác |
| 4 | Xóa debug log | Đạt | Không còn `console.*`, `debugger`, `alert` trong `web/` (trừ `mau.js`, chỉ chạy trên localhost) |
| 5 | Không để secret ở frontend | Đạt | Chỉ có URL và khóa anon (đã kiểm role là anon). Không có `service_role` hay mật khẩu |
| 6 | Không hiện lỗi chi tiết | Đạt | `loiRpc` chỉ hiện thông báo nghiệp vụ tiếng Việt; mọi lỗi khác hiện "Có lỗi xảy ra" |
| 7 | Giới hạn loại file upload | Đạt | Bucket chỉ nhận JPEG, PNG, WebP; chỉ admin hoặc chính bác sĩ được tải lên thư mục của mình. Giao diện tải ảnh chưa làm. Kiểm tra loại file dựa trên Content-Type khai báo, chưa quét nội dung |
| 8 | Giới hạn dung lượng | Đạt | 2 MB, đặt ở bucket (phía máy chủ) |
| 9 | Validate lại ở server | Đạt | Mọi quy tắc nằm ở ràng buộc CHECK, hàm nghiệp vụ và RLS; 279 kiểm thử. Giao diện chỉ báo lỗi sớm |
| 10 | IDOR (đổi id trên đường dẫn) | Một phần | Kiểm thử cô lập giữa các chủ nuôi đạt trên cơ sở dữ liệu thử; id là UUID nhưng không dựa vào việc khó đoán. Chưa thử bằng hai tài khoản thật trên Supabase thật |
| 11 | Tài khoản thường chui vào admin | Một phần | Khách chưa đăng nhập đã thử và đạt. Các hàm admin tự kiểm tra vai trò và đã có kiểm thử. Chưa thử bằng tài khoản chủ nuôi thật |
| 12 | Truy vấn parameterized | Đạt | Dùng PostgREST và RPC có tham số; hàm không nối chuỗi SQL từ dữ liệu người dùng (`EXECUTE` duy nhất chạy trên danh sách bảng cố định, dùng `%I`). Ô tìm khách đã lọc ký tự đặc biệt của bộ lọc và vẫn có RLS chặn phía sau |
| 13 | Bắt buộc HTTPS | Chờ kiểm tra | Cloudflare Pages chỉ phục vụ HTTPS; đã gửi header HSTS. Cần xác nhận sau khi triển khai |
| 14 | Security headers | Chờ kiểm tra | `web/_headers` có CSP, chống nhúng khung, nosniff, Referrer-Policy, Permissions-Policy, HSTS. Điểm yếu còn lại: `style-src 'unsafe-inline'` (giao diện có style nội tuyến) và cho phép script từ jsdelivr cho đến khi tự lưu thư viện Supabase. Cần quét lại sau triển khai |
| 15 | Cookie httpOnly, secure, samesite | Chưa đạt theo đúng nghĩa | Không có máy chủ ứng dụng nên không có cookie phiên; `supabase-js` lưu phiên ở localStorage, không thể đặt httpOnly. Rủi ro là XSS đánh cắp token; bù bằng CSP, luôn dùng `textContent`, không script nội tuyến, token ngắn hạn |
| 16 | CORS chỉ cho domain cần thiết | Một phần | API do Supabase quản lý, không giới hạn được theo tên miền như tự dựng máy chủ. Quyền truy cập dựa trên token Bearer và RLS chứ không phải cookie, nên CORS không phải lớp chặn chính |
| 17 | Cơ sở dữ liệu không mở public | Một phần | Giao diện không có đường tới cổng PostgreSQL; Data API chỉ lộ schema `public` và đã đóng bằng RLS. Cổng kết nối trực tiếp của Supabase vẫn tồn tại, được bảo vệ bằng mật khẩu; cần đặt mật khẩu mạnh và kiểm tra mục hạn chế mạng trong Project Settings, Database |
| 18 | Tài khoản cơ sở dữ liệu quyền tối thiểu | Đạt | Thu hồi toàn bộ quyền mặc định, cấp theo bảng và cột; 26 hàm nghiệp vụ chỉ cấp cho `authenticated`; hàm `SECURITY DEFINER` đều cố định `search_path`; kiểm thử quét quyền và RLS |
| 19 | Đưa web qua Cloudflare | Một phần | Web phát bằng Cloudflare Pages (CDN, chống DDoS cơ bản, SSL). Chưa bật Turnstile và luật giới hạn tần suất. API Supabase gọi thẳng, không qua Cloudflare |
| 20 | Sao lưu tự động và theo dõi lỗi | Chưa | Gói Free không có sao lưu tự động ("Automatic backups: Not included"; Pro có 7 ngày). Log API và cơ sở dữ liệu giữ 1 ngày. Chưa có công cụ theo dõi lỗi |

Việc bổ sung phát hiện thêm khi rà soát: xác thực hai lớp (TOTP) cho admin có sẵn miễn phí ở Supabase nhưng giao diện chưa có màn hình đăng ký; dự án gói Free bị tạm dừng sau 1 tuần không hoạt động.

Nguồn: https://supabase.com/pricing.md

## Cập nhật sau rà soát (19/10/2026, buổi chiều)

Đã làm trong khuôn khổ gói miễn phí:
- Điểm 3: tự đăng xuất khi không thao tác (30 phút với nhân viên và admin, 60 phút với chủ nuôi). Chỉ có tác dụng ở trình duyệt; hết phiên phía máy chủ vẫn là tính năng gói Pro.
- Xác thực hai lớp (TOTP) cho admin: màn hình đăng ký, bước nhập mã khi đăng nhập, và ràng buộc ở cơ sở dữ liệu (`vai_tro_hien_tai` không công nhận admin đã đăng ký TOTP khi phiên chưa ở mức aal2). Thêm 9 kiểm thử, tổng 288.
- Điểm 10, 11: công cụ `tools/kiem-tra-idor.html` dùng hai tài khoản chủ nuôi thử. Chưa chạy, chờ tác giả thực hiện.
- Điểm 20: GitHub Actions sao lưu hằng ngày (mã hóa, giữ 30 ngày) và gọi API giữ dự án hoạt động. Chưa chạy, chờ thêm hai GitHub Secrets.
