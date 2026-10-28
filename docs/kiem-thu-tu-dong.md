# Kiểm thử tự động bằng trình duyệt thật

Mục đích: bắt những lỗi chỉ xuất hiện khi dùng thật (đăng nhập, phân quyền, nút bấm, giao diện điện thoại), vì các kiểm thử cơ sở dữ liệu trong `db/test/` chạy trên PostgreSQL giả lập nên **không** thấy được chúng.

Bộ kiểm thử dùng Playwright (thư mục `e2e/`), chạy trên GitHub Actions. Có hai phần:

| Phần | Chạy ở đâu | Làm gì |
|---|---|---|
| Giao diện với Supabase cục bộ (`e2e/tests/`) | Máy chủ tĩnh cục bộ trong Actions, nối vào **Supabase cục bộ tạm thời** | Đăng nhập từng vai trò, vào khu không phải của mình, nhắn tin (lỗi nút Gửi quay mãi), viết và đăng bài, giao diện điện thoại |
| Bản đang chạy (`e2e/prod/`) | Bản đã triển khai trên Cloudflare, **chỉ đọc** | Trang tải được, tiêu đề bảo mật (CSP), dữ liệu công khai hiện, khu nhân viên đưa khách về đăng nhập |

Cả hai phần chạy khi có PR sửa `web/`, `e2e/`, `db/`, và mỗi ngày một lần, và đều không cần cấu hình gì thêm.

## Cách phần giao diện chạy (không cần thiết lập gì)

Mỗi lần chạy, GitHub Actions tự dựng một **Supabase cục bộ tạm thời** bằng Docker (Auth, API, Storage thật của Supabase, chạy ngay trong máy ảo của lần chạy), cài `db/01` đến `04`, tạo một admin thử rồi chạy giao diện trong repo nối vào đó. Xong lần chạy thì mọi thứ bị xóa. Vì vậy:

- Không tạo project Supabase nào, không cần thêm GitHub Secrets, không tốn gói miễn phí (Supabase giới hạn 2 project miễn phí mỗi tổ chức).
- Không bao giờ chạm vào dữ liệu thật; mỗi lần chạy là một cơ sở dữ liệu mới, không bị dữ liệu của lần trước làm nhiễu.
- Chạy tay: tab Actions, workflow "Kiểm thử tự động", Run workflow.

Khác biệt so với Supabase thật: không có SMTP thật, không có cấu hình Cloudflare, phiên bản các dịch vụ có thể lệch đôi chút so với bản đang chạy.

## Chạy trên máy cá nhân

Cần Docker và Supabase CLI. Chạy `supabase init` rồi `supabase start` trong một thư mục ngoài repo, nạp `db/01` đến `04` bằng `psql`, tạo admin thử như workflow, rồi:

```bash
cd e2e
npm install && npx playwright install chromium
export E2E_SUPABASE_URL=... E2E_SUPABASE_ANON_KEY=... E2E_ADMIN_EMAIL=... E2E_ADMIN_PASSWORD=... E2E_MAT_KHAU=...
npx playwright test                                # giao diện + Supabase cục bộ
npx playwright test -c playwright.prod.config.js   # bản đang chạy, chỉ đọc
npx playwright test --headed --project=may-tinh    # xem trình duyệt chạy
```

(Cũng có thể trỏ vào một project Supabase thử riêng trên supabase.com nếu bạn có, miễn là không trùng hệ thống thật; script tự từ chối nếu URL trùng `web/js/config.js`.)

Khi lỗi, báo cáo HTML, ảnh chụp và bản ghi thao tác (trace) được lưu thành artifact của lần chạy trên GitHub.

## Những gì bộ kiểm thử không bao phủ

- **Email thật** (Gmail SMTP, thư đặt lại mật khẩu, thư xác nhận): Supabase cục bộ không gửi thư thật, nên cần dùng tay kiểm tra.
- **Cấu hình riêng của hệ thống thật**: Redirect URL trong Supabase, SMTP, CAPTCHA, biến môi trường Cloudflare. Phần chạy trên bản đang chạy chỉ kiểm tra những gì nhìn thấy từ ngoài (tải được trang, tiêu đề bảo mật), không đăng nhập.
- **Luồng đặt lịch đến thanh toán**: chưa có kịch bản, cần thêm dữ liệu mẫu (bác sĩ, lịch làm việc, kho thuốc) cho cơ sở dữ liệu thử. Đây là phần nên bổ sung tiếp.
- Công cụ chỉ bắt được lỗi ở những luồng đã viết kịch bản; nó giảm rủi ro chứ không thay việc tự dùng thử.
