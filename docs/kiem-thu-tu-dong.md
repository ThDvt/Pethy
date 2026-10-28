# Kiểm thử tự động bằng trình duyệt thật

Mục đích: bắt những lỗi chỉ xuất hiện khi dùng thật (đăng nhập, phân quyền, nút bấm, giao diện điện thoại), vì các kiểm thử cơ sở dữ liệu trong `db/test/` chạy trên PostgreSQL giả lập nên **không** thấy được chúng.

Bộ kiểm thử dùng Playwright (thư mục `e2e/`), chạy trên GitHub Actions. Có hai phần:

| Phần | Chạy ở đâu | Làm gì |
|---|---|---|
| Giao diện với Supabase thử (`e2e/tests/`) | Máy chủ tĩnh cục bộ trong Actions, nối vào **project Supabase thử** | Đăng nhập từng vai trò, vào khu không phải của mình, nhắn tin (lỗi nút Gửi quay mãi), viết và đăng bài, giao diện điện thoại |
| Bản đang chạy (`e2e/prod/`) | Bản đã triển khai trên Cloudflare, **chỉ đọc** | Trang tải được, tiêu đề bảo mật (CSP), dữ liệu công khai hiện, khu nhân viên đưa khách về đăng nhập |

Phần thứ nhất chạy khi có PR sửa `web/`, `e2e/`, `db/`, và mỗi ngày một lần. Có thể bấm chạy tay ở tab Actions (Run workflow). Phần thứ hai không cần cấu hình gì thêm.

## Thiết lập project Supabase thử (làm một lần)

Dùng một project **riêng**, không dùng project đang chạy thật. Bộ kiểm thử tạo tài khoản và bài viết thử, nên không được trỏ vào dữ liệu thật (script tự từ chối nếu URL trùng với `web/js/config.js`).

1. Trên supabase.com tạo project mới (gói miễn phí cho 2 project), ví dụ `pethy-test`.
2. Trong SQL Editor chạy lần lượt `db/01_schema.sql`, `02_logic.sql`, `03_rls.sql`, `04_storage.sql`. Bốn file này là bản cài mới và đã gồm mọi bản vá hiện có (không cần chạy `06` đến `10`).
3. Authentication → Providers → Email: **tắt "Confirm email"** (để tài khoản thử đăng ký xong dùng được ngay, không cần thư).
4. Tạo tài khoản admin thử: mở bất kỳ bản giao diện nào đang nối vào project thử, hoặc vào Authentication → Users → Add user (tick Auto Confirm User), email ví dụ `admin-thu@example.com`. Rồi chạy SQL nâng quyền một lần:
   ```sql
   UPDATE tai_khoan SET vai_tro = 'admin'
    WHERE id = (SELECT id FROM auth.users WHERE email = 'admin-thu@example.com');
   ```
   Đừng bật xác thực hai lớp cho admin thử.
5. Ở GitHub: Settings → Secrets and variables → Actions → New repository secret, thêm 5 secret:

   | Secret | Giá trị |
   |---|---|
   | `E2E_SUPABASE_URL` | URL của project thử (Project Settings → API) |
   | `E2E_SUPABASE_ANON_KEY` | khóa `anon` public của project thử |
   | `E2E_ADMIN_EMAIL` | email admin thử ở bước 4 |
   | `E2E_ADMIN_PASSWORD` | mật khẩu admin thử |
   | `E2E_MAT_KHAU` | một mật khẩu bất kỳ (ít nhất 8 ký tự) dùng cho các tài khoản thử còn lại |

6. Tab Actions → "Kiểm thử tự động" → Run workflow. Lần chạy đầu sẽ tự tạo các tài khoản `e2e-le-tan@example.com`, `e2e-bac-si@example.com`, `e2e-thu-ngan@example.com`, `e2e-kho@example.com`, `e2e-chu-nuoi@example.com` và gán vai trò.

Chưa có secrets thì job thứ nhất tự bỏ qua kèm cảnh báo; job "bản đang chạy" vẫn chạy.

## Chạy trên máy cá nhân

```bash
cd e2e
npm install && npx playwright install chromium
export E2E_SUPABASE_URL=... E2E_SUPABASE_ANON_KEY=... E2E_ADMIN_EMAIL=... E2E_ADMIN_PASSWORD=... E2E_MAT_KHAU=...
npx playwright test                         # giao diện + Supabase thử
npx playwright test -c playwright.prod.config.js   # bản đang chạy, chỉ đọc
npx playwright test --headed --project=may-tinh    # xem trình duyệt chạy
```

Khi lỗi, báo cáo HTML, ảnh chụp và bản ghi thao tác (trace) được lưu thành artifact của lần chạy trên GitHub.

## Những gì bộ kiểm thử không bao phủ

- **Email thật** (Gmail SMTP, thư đặt lại mật khẩu, thư xác nhận): project thử tắt xác nhận email, nên cần dùng tay kiểm tra.
- **Cấu hình riêng của hệ thống thật**: Redirect URL trong Supabase, SMTP, CAPTCHA, biến môi trường Cloudflare. Phần chạy trên bản đang chạy chỉ kiểm tra những gì nhìn thấy từ ngoài (tải được trang, tiêu đề bảo mật), không đăng nhập.
- **Luồng đặt lịch đến thanh toán**: chưa có kịch bản, cần thêm dữ liệu mẫu (bác sĩ, lịch làm việc, kho thuốc) cho project thử. Đây là phần nên bổ sung tiếp.
- Công cụ chỉ bắt được lỗi ở những luồng đã viết kịch bản; nó giảm rủi ro chứ không thay việc tự dùng thử.
