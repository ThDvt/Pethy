# Kiểm thử tự động bằng trình duyệt thật

Mục đích: bắt những lỗi chỉ xuất hiện khi dùng thật (đăng nhập, phân quyền, nút bấm, giao diện điện thoại), vì các kiểm thử cơ sở dữ liệu trong `db/test/` chạy trên PostgreSQL giả lập nên **không** thấy được chúng.

Bộ kiểm thử dùng Playwright (thư mục `e2e/`), chạy trên GitHub Actions. Có hai phần:

| Phần | Chạy ở đâu | Làm gì |
|---|---|---|
| Giao diện với Supabase cục bộ (`e2e/tests/`, 17 file) | Máy chủ tĩnh cục bộ trong Actions, nối vào **Supabase cục bộ tạm thời** | Xem bảng "Các nhóm kịch bản" bên dưới |
| Bản đang chạy (`e2e/prod/`) | Bản đã triển khai trên Cloudflare, **chỉ đọc** | Trang tải được, tiêu đề bảo mật (CSP), dữ liệu công khai hiện, khu nhân viên đưa khách về đăng nhập |

Lần chạy gần nhất trên nhánh chính cho **130 lượt kiểm thử đạt** (một kịch bản chạy trên nhiều trình duyệt thì tính nhiều lượt), có thể thêm một vài lượt chập chờn tự đạt khi chạy lại. Con số này đếm lượt chạy, không phải số lỗi đã loại trừ.

### Các nhóm kịch bản

| File | Nội dung |
|---|---|
| 01 | Đăng nhập từng vai trò, mật khẩu sai; vào khu không phải của mình thì bị đưa về khu của mình; khách chưa đăng nhập bị đưa về đăng nhập; chủ nuôi không đọc được dữ liệu nhạy cảm qua API |
| 02, 03 | Nhắn tin nội bộ (lỗi nút Gửi quay mãi); viết, đăng, ẩn bài viết |
| 04, 11 | Điện thoại: trang công khai không tràn ngang; các hộp thêm khách, thêm dịch vụ, thêm nhân viên, thêm thuốc nằm gọn trong màn hình |
| 05 | Đặt lịch đến thanh toán qua năm vai trò, kiểm tra kho bị trừ đúng |
| 06 | Thủ kho thêm thuốc, nhập lô, kiểm kê có lý do, cảnh báo sắp hết; vai trò khác không sửa được kho |
| 07 | Lễ tân đặt lịch hộ, đổi giờ và hủy lịch, tiêm vaccine trừ liều |
| 08 | Quản trị: dịch vụ, tham số và chế độ bảo trì, tài khoản nhân viên (thêm, đổi vai trò, khóa, xóa), ca làm việc, nhật ký; không phải admin thì bị chặn qua API |
| 09 | Đánh giá và ẩn đánh giá, việc cần nhắc của lễ tân, đăng ký tài khoản |
| 10 | Hồ sơ bác sĩ và ảnh đại diện |
| 12 | Đồng thời và sự cố: hai người cùng đặt một giờ, cùng xác nhận, cùng thu tiền, cùng kê thuốc vượt kho; bấm đúp; mất mạng rồi có lại |
| 13 | Dữ liệu lạ (dấu, emoji, HTML, tên rất dài, trùng tên) và số liệu doanh thu |
| 14 | Cô lập giữa hai chủ nuôi: qua API và qua địa chỉ trang |
| 15 | Phiên đăng nhập: hết phiên sau 30 phút (nhân viên) và 60 phút (chủ nuôi) kể cả khi có thao tác, mất phiên giữa chừng, đăng xuất rồi bấm Back, hai tab, tài khoản bị khóa khi đang dùng |
| 16, 17 | Số lượng lớn: 250 khách, 330 thú cưng, 120 lịch chờ, hàng trăm hóa đơn nạp thẳng vào CSDL thử; kiểm tra tốc độ ở mức dưới 15 giây, không tràn ngang, báo đúng tổng khi danh sách bị cắt, số tiền khớp tổng tính bằng SQL |

### Trình duyệt

Chrome máy tính và Pixel 7 chạy toàn bộ. Firefox, Safari máy tính (WebKit) và iPhone 14 (WebKit giả lập) chỉ chạy các kịch bản đại diện: đăng nhập và phân quyền, luồng đặt lịch đến thanh toán, giao diện điện thoại. WebKit của Playwright **gần** Safari nhưng không phải Safari thật.

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
- **Điện thoại và iPhone thật**: bàn phím ảo, thanh địa chỉ co giãn, cử chỉ vuốt, hiệu năng máy yếu. Chỉ có giả lập màn hình và trình duyệt.
- **Dữ liệu cực lớn và mạng thật**: kiểm thử số lượng lớn dừng ở vài trăm bản ghi, trên CSDL cục bộ nên không có độ trễ mạng của Supabase thật. Mức chấp nhận 15 giây là ngưỡng rộng, chưa phải đo tốc độ.
- **Danh sách chỉ cắt và báo**: lễ tân (50 lịch chờ), danh sách khách (30), hóa đơn chủ nuôi (50) và nhật ký (100) hiện phần đầu và báo tổng, chưa có nút xem thêm hay phân trang.
- **"Đánh dấu không đến"**: cần lịch đã qua giờ nên chưa có kịch bản.
- **Kết quả xanh không phải bằng chứng hết lỗi**: bộ kiểm thử có lúc chập chờn (ví dụ bài phân quyền trên Firefox và hộp hóa đơn của thu ngân trên Safari từng đỏ một lần rồi đạt khi chạy lại). Các bài đồng thời chạy từ một máy nên chưa giống nhiều người dùng thật từ nhiều nơi.
- **Cloudflare Workers Builds** báo đỏ trên nhánh PR (trên nhánh chính thì đạt), nguyên nhân chưa tìm ra.
- Công cụ chỉ bắt được lỗi ở những luồng đã viết kịch bản; nó giảm rủi ro chứ không thay việc tự dùng thử.
