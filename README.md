# Pethy

Hệ thống quản lý phòng khám thú y chạy trên internet: chủ nuôi đặt lịch khám và tiêm phòng, lễ tân điều phối lịch, bác sĩ ghi hồ sơ và kê đơn, thủ kho quản lý thuốc và vaccine theo lô, thu ngân lập hóa đơn và thu tiền, quản trị xem báo cáo và quản lý hệ thống.

Dự án cá nhân của sinh viên năm cuối ngành Công nghệ thông tin, Trường Đại học Sư phạm Hà Nội 2.

## Tính năng theo vai trò

| Vai trò | Việc làm được |
|---|---|
| Chủ nuôi | Đăng ký, quản lý thú cưng, đặt, đổi, hủy lịch theo quy tắc giờ, xem hồ sơ khám và hóa đơn của mình |
| Lễ tân | Xác nhận hoặc từ chối lịch, đặt lịch hộ khách đến trực tiếp, quản lý khách hàng, nhắc lịch và mũi tiêm đến hạn |
| Bác sĩ | Xem lịch khám của mình, ghi hồ sơ (cân nặng, nhiệt độ, chẩn đoán), kê đơn thuốc có trừ kho, ghi mũi tiêm |
| Thủ kho | Nhập kho theo lô, kiểm kê điều chỉnh có lý do, theo dõi tồn, hạn dùng và cảnh báo sắp hết |
| Thu ngân | Lập hóa đơn từ lịch đã khám, thu tiền nhiều lần bằng tiền mặt hoặc chuyển khoản |
| Quản trị | Doanh thu và công nợ, tài khoản và vai trò, dịch vụ và giá, lịch làm việc, tham số hệ thống, nhật ký, trao đổi nội bộ |

## Kiến trúc

Trình duyệt (HTML, CSS, JavaScript thuần) gọi trực tiếp Supabase (Auth, PostgREST, Storage) trên PostgreSQL; trang tĩnh được phát bằng Cloudflare Pages. Không có máy chủ ứng dụng riêng: toàn bộ nghiệp vụ và phân quyền nằm trong cơ sở dữ liệu.

- Mọi bảng (23) đều bật Row Level Security; quyền mặc định bị thu hồi, chỉ cấp lại đúng cột và đúng vai trò.
- Nghiệp vụ ghi dữ liệu đi qua 26 hàm `SECURITY DEFINER` đặt `search_path` cố định, mỗi hàm tự kiểm tra vai trò.
- Khách chưa đăng nhập chỉ đọc được giá dịch vụ, danh sách bác sĩ và thông báo bảo trì.
- Đặt trùng giờ bị chặn ở mức chỉ mục duy nhất; kho trừ theo lô gần hết hạn trước (FEFO) trong cùng giao dịch với kê đơn.
- Giao diện không chèn dữ liệu bằng `innerHTML`, có chính sách CSP chặt (`web/_headers`).

Chi tiết: [`docs/thiet-ke-bao-mat.md`](docs/thiet-ke-bao-mat.md).

## Cấu trúc thư mục

```
web/     Giao diện (trang tĩnh), cấu hình công khai trong web/js/config.js
db/      Lược đồ, nghiệp vụ, RLS và Storage
docs/    Thiết kế bảo mật, hướng dẫn dựng Supabase, tiến độ, nguồn vẽ sơ đồ
tools/   Trang tự tấn công: bằng khóa anon, và bằng hai tài khoản chủ nuôi (IDOR, nâng quyền)
```

## Chạy thử

1. Tạo project Supabase, chạy lần lượt `db/01_schema.sql`, `02_logic.sql`, `03_rls.sql`, `04_storage.sql` (xem [`docs/huong-dan-supabase.md`](docs/huong-dan-supabase.md)).
2. Điền URL và khóa **anon** vào `web/js/config.js`. Không bao giờ đặt khóa `service_role` hay mật khẩu cơ sở dữ liệu vào thư mục `web`.
3. Phát thư mục `web` bằng máy chủ tĩnh bất kỳ, ví dụ `python3 -m http.server` trong thư mục `web`.

Xem giao diện không cần Supabase: mở `http://localhost:8000/?mau=1&vt=admin` (đổi `vt` thành `chu_nuoi`, `le_tan`, `bac_si`, `thu_ngan`, `kho`). Chế độ dữ liệu mẫu chỉ hoạt động trên localhost.
