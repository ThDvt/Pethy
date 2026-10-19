# Hướng dẫn dựng cơ sở dữ liệu Pethy trên Supabase

Làm đúng thứ tự. Mỗi bước có cách kiểm tra. Không bước nào cần khóa `service_role` hay mật khẩu cơ sở dữ liệu; đừng gửi hai thứ đó cho ai, kể cả khi nhờ hỗ trợ.

## 1. Chạy bốn file SQL
Vào Supabase, chọn project, mở **SQL Editor**, bấm **New query**. Dán và bấm **Run** lần lượt từng file (mỗi file một query mới):
1. `db/01_schema.sql`
2. `db/02_logic.sql`
3. `db/03_rls.sql`
4. `db/04_storage.sql`

Không chạy file nào trong thư mục `db/test/`. Mỗi file phải báo **Success** trước khi sang file kế tiếp. Nếu có lỗi đỏ, chụp màn hình dòng lỗi gửi lại, đừng chạy tiếp.

Kiểm tra: chạy câu sau, kết quả phải là **0** (nghĩa là mọi bảng trong schema public đều đã bật RLS):
```sql
select count(*) from pg_tables where schemaname = 'public' and not rowsecurity;
```

## 2. Cấu hình Authentication
- **Authentication, Sign In / Providers, Email**: bật **Confirm email**.
- Cùng trang: tắt **Allow anonymous sign-ins**.
- **Authentication, URL Configuration**: đặt **Site URL** là địa chỉ web thật khi đã triển khai (tạm thời để mặc định).

## 3. Cấu hình API
**Project Settings, API (hoặc Data API)**: mục **Exposed schemas** chỉ để `public`. Không để thêm schema nào khác.

## 4. Tạo tài khoản admin đầu tiên (không cần có website)
1. **Authentication, Users, Add user, Create new user**: nhập email thật và một mật khẩu mạnh, **bật "Auto Confirm User"** để bỏ qua bước xác nhận email.
2. Trong **SQL Editor** chạy (thay email):
```sql
update tai_khoan set vai_tro = 'admin'
 where id = (select id from auth.users where email = 'email-cua-ban@example.com');
```
3. Kiểm tra: `select ho_ten, vai_tro from tai_khoan;` phải có một dòng `admin`.

Sau khi web chạy, đăng nhập bằng email và mật khẩu này để vào khu quản trị. Người khác đăng ký trên web sẽ là chủ nuôi, bạn đổi vai trò cho họ trong trang Tài khoản.

## 5. Tự tấn công bằng khóa anon (bắt buộc trước khi mở cho người dùng)
Mục đích: kiểm tra đúng kiểu tấn công trong video, tức là kẻ lạ chưa đăng nhập, chỉ có URL và khóa anon (ai mở web cũng lấy được hai thứ này bằng Inspect), thử đọc dữ liệu hoặc nâng quyền.

**Cách làm**
1. Tải file `kiem-tra-anon.html` về máy (đã có sẵn URL và khóa anon bên trong, không cần file nào khác).
2. Bấm đúp vào file để mở bằng Chrome hoặc Edge. Cần có mạng. Không cần đăng nhập.
3. Bấm nút **Chạy kiểm tra**, chờ 10 đến 20 giây cho đến khi hiện bảng kết quả.
4. Đọc dòng tiêu đề màu ngay trên bảng:
   - Xanh, **"Không mục nào bị lộ"**: đạt. Chụp toàn bộ trang gửi lại.
   - Đỏ, **"Có N mục bị lộ"**: không đạt. Chụp trang gửi lại, đừng triển khai.

**Bảng có 36 dòng, đọc như sau**
- 30 dòng **"đọc ..."**: thử đọc từng bảng và view. Đúng là **AN TOÀN**, ghi chú ở dạng "bị chặn (42501)" hoặc "không có dòng nào". Riêng 3 dòng `cau_hinh`, `dich_vu`, `bac_si_cong_khai` được phép "đọc được ... dòng (được phép)" vì là thông tin công khai của phòng khám (giá dịch vụ, danh sách bác sĩ, thông báo bảo trì).
- 1 dòng **"sửa vai_tro trong tai_khoan"**: kẻ lạ thử tự nâng mình thành admin. Đúng là AN TOÀN, ghi chú "bị chặn" hoặc "không sửa được dòng nào".
- 5 dòng **"gọi ..."**: thử gọi hàm xem hồ sơ khám, xem doanh thu, xem giờ trống, đổi vai trò, nhập kho. Cả năm phải là AN TOÀN, ghi chú "bị chặn: ...".

**Nếu bảng báo toàn "bị chặn" kể cả `cau_hinh`** thì thường là bốn file SQL chưa chạy xong hoặc chạy sai thứ tự; quay lại bước 1. Nếu trang báo lỗi mạng hoặc không hiện bảng, nhấn F12, chọn thẻ Console, chụp dòng đỏ gửi lại.
