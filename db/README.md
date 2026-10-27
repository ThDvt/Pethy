# Cơ sở dữ liệu — Hệ thống quản lý phòng khám thú y (Pethy)

PostgreSQL trên Supabase. Toàn bộ nghiệp vụ và phân quyền nằm ở đây; giao diện HTML/CSS/JS chỉ gọi `supabase.rpc(...)` và đọc dữ liệu qua RLS.

## Cấu trúc thư mục

| File | Nội dung |
|---|---|
| `01_schema.sql` | 23 bảng, ràng buộc, chỉ mục (gồm chỉ mục chống đặt trùng giờ), cấu hình mặc định |
| `02_logic.sql` | Hàm hỗ trợ, 26 hàm nghiệp vụ (RPC) gọi được từ trình duyệt, view, trigger, phân quyền thực thi hàm |
| `03_rls.sql` | Bật RLS, quyền theo bảng/cột, chính sách theo vai trò |
| `04_storage.sql` | Bucket `avatar-bac-si` và chính sách ảnh đại diện bác sĩ |
| `05_mfa_admin.sql` | Bản vá cho CSDL đã cài trước: bắt buộc mã xác thực hai lớp với admin đã đăng ký TOTP (bản cài mới đã có trong `02_logic.sql`) |
| `06_mo_ta_dich_vu_va_lich_bac_si.sql` | Bản vá cho CSDL đã cài trước: thêm `dich_vu.mo_ta` và cột `lich_lam_viec` (công khai) trong view `bac_si_cong_khai` (bản cài mới đã có trong 01, 02, 03) |
| `07_danh_gia.sql` | Bản vá cho CSDL đã cài trước: bảng `danh_gia`, hàm `gui_danh_gia` và `an_hien_danh_gia`, view `danh_gia_cong_khai`, điểm trung bình trong `bac_si_cong_khai` (chạy sau 06; bản cài mới đã có trong 01, 02, 03) |
| `08_email_tai_khoan.sql` | Bản vá cho CSDL đã cài trước: hàm `danh_sach_tai_khoan()` (chỉ admin) để trang Tài khoản hiện email. |
| `09_chung_chi_bac_si.sql` | Bản vá cho CSDL đã cài trước: thêm `trinh_do`, `kinh_nghiem_nam`, `chung_chi` vào hồ sơ bác sĩ và vào view `bac_si_cong_khai`. |
| `10_bai_viet.sql` | Bản vá cho CSDL đã cài trước: bảng `bai_viet` (tin tức do admin viết), hàm/trigger `dat_ngay_bai_viet`, chính sách RLS (khách chỉ đọc bài đã đăng, chỉ admin ghi), nhật ký thay đổi. |
| `test/` | Stub Supabase, `reset.sh`, `10_behavior.sql` (175 kiểm thử), `11_reports_chat.sql` (75 kiểm thử), `12_security.sql` (86 kiểm thử, gồm quét RLS và quyền) |

## Cài lên Supabase

1. Tạo project Supabase.
2. Vào **SQL Editor**, chạy lần lượt `01_schema.sql` → `02_logic.sql` → `03_rls.sql` → `04_storage.sql`. **Không chạy** `test/00_stub_supabase.sql`.
3. **Authentication → Providers → Email**: bật xác nhận email (Confirm email).
4. **Authentication → Sign In / Providers**: tắt đăng ký ẩn danh (Anonymous sign-ins).

### Tạo admin đầu tiên

Mọi tài khoản đăng ký đều là `chu_nuoi`. Admin đầu tiên phải tạo thủ công một lần:

1. Đăng ký tài khoản bình thường trên website (hoặc Authentication → Users → Add user).
2. Trong SQL Editor chạy (thay email):

```sql
UPDATE tai_khoan SET vai_tro = 'admin'
 WHERE id = (SELECT id FROM auth.users WHERE email = 'ban@example.com');
```

Từ đó admin đổi vai trò cho người khác qua `dat_vai_tro`. Không tự đổi/khóa/xóa chính mình nên hệ thống không bao giờ mất admin.

## Kiểm thử cục bộ

Cần PostgreSQL 16 chạy ở cổng 5544, thư mục socket `/var/tmp/pgtest-vet`.

```bash
./test/reset.sh                                   # dựng lại DB thử, in RESET_OK
psql -h /var/tmp/pgtest-vet -p 5544 -U postgres -d vettest -q -f test/10_behavior.sql
psql -h /var/tmp/pgtest-vet -p 5544 -U postgres -d vettest -q -f test/11_reports_chat.sql   # chạy sau file 10
psql -h /var/tmp/pgtest-vet -p 5544 -U postgres -d vettest -q -f test/12_security.sql        # chạy sau file 11
```

Kết quả cuối cùng: 175/175, 75/75 và 86/86 (tổng 336 kiểm thử, 0 lỗi). Ba file test phải chạy theo thứ tự 10, 11, 12 trên cơ sở dữ liệu vừa `reset.sh`; chạy lại một file riêng sẽ cho kết quả sai vì dữ liệu đã thay đổi. Ngoài ra đã chạy thử 8 phiên đồng thời cùng đặt một khung giờ: đúng 1 thành công, 7 nhận `KHUNG_GIO_DA_DAT`.

Bộ kiểm thử bao gồm: quyền từng vai trò, cô lập dữ liệu giữa các chủ nuôi, đặt trùng giờ, quy tắc hủy/đổi, giới hạn lịch chờ, kho FEFO, kê đơn thiếu hàng (hoàn tác toàn bộ), kê lại đơn (hoàn kho), hóa đơn/thanh toán nhiều lần, bảng chỉ-thêm, chế độ bảo trì, khách chưa đăng nhập, trigger đăng ký không tin vai trò từ client, khóa/xóa tài khoản, nhật ký.

## Cách giao diện làm việc với CSDL

- **Đọc**: `supabase.from('bang').select(...)`; RLS tự lọc theo người đăng nhập.
- **Ghi giao dịch**: `supabase.rpc('ten_ham', {p_...})`.
- **Ghi trực tiếp** (chỉ các bảng danh mục/hồ sơ đơn giản, giới hạn cột): `tai_khoan` (ho_ten, so_dien_thoai), `chu_nuoi`, `thu_cung`, `ho_so_bac_si`, `lich_lam_viec`, `cau_hinh`, `dich_vu`, `thuoc`.

### Danh sách RPC

| Hàm | Vai trò | Việc làm |
|---|---|---|
| `khung_gio_trong(bac_si, ngay)` | chu_nuoi, le_tan | Các khung giờ còn trống |
| `dat_lich(thu_cung, bac_si, dich_vu, thoi_gian, vaccine?, ghi_chu?)` | chu_nuoi, le_tan | Đặt lịch (lễ tân đặt hộ tự xác nhận) |
| `doi_lich(lich, thoi_gian, bac_si?)` | chu_nuoi, le_tan | Đổi giờ |
| `huy_lich(lich, ly_do?)` | chu_nuoi, le_tan | Hủy lịch |
| `xac_nhan_lich(lich)` | le_tan | Xác nhận lịch chờ |
| `danh_dau_khong_den(lich)` | le_tan | Khách không đến |
| `ghi_ho_so_kham(lich, chan_doan, can_nang?, nhiet_do?, ghi_chu?)` | bac_si | Ghi hồ sơ khám |
| `xem_ho_so_kham(thu_cung)` | bac_si, admin | Xem lịch sử khám và đơn thuốc của một thú cưng (trả JSON). **Bác sĩ và admin không đọc trực tiếp bảng hồ sơ, đơn thuốc**; mỗi lần gọi ghi một dòng `xem` vào nhật ký. Chủ nuôi vẫn đọc phần của mình trực tiếp |
| `ke_don(ho_so, dong jsonb)` | bac_si | Kê đơn và trừ kho |
| `ghi_tiem(lich, ngay_tiem_tiep?, vaccine?)` | bac_si | Ghi mũi tiêm, trừ vaccine |
| `nhap_kho(thuoc, so_lo, han_dung, so_luong)` | kho | Nhập kho |
| `dieu_chinh_kho(lo, so_luong_moi, ly_do)` | kho | Kiểm kê |
| `lap_hoa_don(lich)` / `huy_hoa_don(hoa_don)` | thu_ngan | Lập/hủy hóa đơn |
| `ghi_thanh_toan(hoa_don, so_tien, phuong_thuc)` | thu_ngan | Thu tiền (nhiều lần) |
| `doanh_thu_theo_ngay(tu, den)` | thu_ngan | Báo cáo doanh thu |
| `hoan_tat_ho_so_chu_nuoi(ho_ten, sdt, dia_chi?)` | chu_nuoi | Hoàn tất hồ sơ khách |
| `gop_chu_nuoi(cu, moi)` | le_tan | Gộp hồ sơ khách vãng lai |
| `ghi_nhan_nhac(lich, mui_tiem, kenh, trang_thai?)` | le_tan | Ghi nhận đã nhắc khách |
| `doanh_thu_theo_thang(tu, den)` | admin | Doanh thu (tiền đã thu) theo tháng, tách tiền mặt và chuyển khoản |
| `doanh_thu_theo_dich_vu(tu, den)` | admin | Doanh số theo nhóm Dịch vụ, Thuốc, Vaccine và theo từng mục (từ dòng hóa đơn chưa hủy) |
| `gui_tin_nhan(nhan_vien, noi_dung)` | nhân viên, admin | Gửi tin trong luồng trao đổi nhân viên–admin (văn bản 1–1000 ký tự, tối đa 20 tin mỗi phút) |
| `danh_dau_da_doc(nhan_vien)` | nhân viên, admin | Đánh dấu đã đọc luồng |
| `dat_vai_tro` / `khoa_tai_khoan` / `xoa_tai_khoan` | admin | Quản lý tài khoản |

`admin` luôn được gọi mọi hàm. View: `bac_si_cong_khai`, `ton_kho_lo`, `ton_kho_thuoc`, `canh_bao_kho`, `lich_can_nhac`, `cong_no_hoa_don` (hóa đơn chưa thu đủ, chỉ admin), `hop_thu_noi_bo` (hộp thư kèm số tin chưa đọc).

Định dạng `p_dong` của `ke_don`: `[{"thuoc_id":"<uuid>","so_luong":2,"lieu_dung":"Ngày 2 lần"}]`.

### Mã lỗi

Lỗi nghiệp vụ có dạng `MA_LOI: mô tả`; mã nằm trong `error.hint` của Supabase, mô tả tiếng Việt trong `error.message` (có thể hiển thị cho người dùng). Một số mã thường gặp: `KHUNG_GIO_DA_DAT`, `KHUNG_GIO_KHONG_HOP_LE`, `VUOT_GIOI_HAN_LICH`, `QUA_HAN_DOI_HUY`, `KHO_KHONG_DU`, `DA_LAP_HOA_DON`, `VUOT_SO_TIEN_CON_LAI`, `HE_THONG_BAO_TRI`, `TAI_KHOAN_BI_KHOA`, `KHONG_CO_QUYEN`, `BAN_GHI_BAT_BIEN`, `QUA_NHIEU_YEU_CAU`.

## Chống lạm dụng

- **Giới hạn tần suất cho chủ nuôi** (bảng `gioi_han_goi`, hàm `_gioi_han`): xem giờ trống tối đa 30 lần mỗi phút; đặt, đổi, hủy lịch tối đa 10 lần mỗi phút mỗi loại. Vượt thì nhận `QUA_NHIEU_YEU_CAU`. Nhân viên và admin không bị giới hạn. Lần gọi bị lỗi bị hoàn tác cùng dòng đếm của nó nên giới hạn tính theo lần gọi **thành công**; chặn lưu lượng lỗi là việc của Cloudflare và Supabase.
- **Nhật ký đọc**: mở hồ sơ khám của một thú cưng qua `xem_ho_so_kham` để lại dòng `hanh_dong = 'xem'` trong `nhat_ky`.
- **Kiểm tra tự động** (`test/12_security.sql`): mọi bảng trong `public` phải bật RLS; khách chỉ có quyền với 5 đối tượng công khai (trong đó bài viết chỉ đọc được bài đã đăng); người đăng nhập chỉ ghi trực tiếp được 9 bảng; mọi hàm `SECURITY DEFINER` phải cố định `search_path`; hàm nội bộ và hàm trigger không gọi được từ trình duyệt. Thêm bảng mới mà quên cấu hình thì các kiểm tra này báo đỏ (con số 23 bảng trong test cần cập nhật khi thêm bảng có chủ đích).

## Trao đổi nội bộ (đợt 1, bản nhỏ)

- Mỗi nhân viên (bác sĩ, lễ tân, thu ngân, thủ kho) có **một luồng riêng với admin**; admin thấy mọi luồng, nhân viên chỉ thấy luồng của mình. Chủ nuôi không dùng chức năng này.
- Chỉ văn bản, chỉ thêm (không sửa, không xóa), có đếm tin chưa đọc. Admin đọc được mọi luồng nên nhân viên cần được thông báo điều này.
- Nhận tin tức thời qua Supabase Realtime (bảng `tin_nhan` được thêm vào publication `supabase_realtime`, vẫn chịu RLS). Trên PostgreSQL thường bước này tự bỏ qua.
- Chế độ bảo trì và khóa tài khoản chặn chat như mọi chức năng khác. Hiển thị tin nhắn bằng chữ thuần (`textContent`) để tránh chèn mã.
- Chat giữa chủ nuôi và phòng khám, giữa nhân viên với nhau thuộc đợt 2.

## Các quyết định thiết kế đáng nói trong báo cáo

- **Chống đặt trùng giờ ở tầng CSDL**: chỉ mục duy nhất từng phần trên (bác sĩ, thời gian) với lịch chưa hủy; hai người đặt cùng lúc thì một người nhận lỗi rõ ràng.
- **Kho là sổ cái**: tồn = tổng biến động theo lô; không sửa/xóa dòng cũ, sai thì ghi dòng điều chỉnh. Xuất theo FEFO (gần hết hạn trước), khóa dòng để không xuất vượt tồn.
- **Kê đơn nguyên tử**: kê đơn và trừ kho cùng một giao dịch; thiếu hàng thì hoàn tác toàn bộ.
- **Bảo trì thực thi ở server**: khi bật, mọi vai trò trừ admin bị chặn bởi RLS và các hàm, không chỉ ẩn nút trên giao diện.
- **Vai trò không tin client**: trigger đăng ký luôn tạo `chu_nuoi`, bỏ qua metadata.
- **Nhật ký tự động** (trigger, jsonb cũ/mới), bảng nhật ký/thanh toán/sổ kho chỉ thêm.
- **Tiền** là số nguyên VND; múi giờ Asia/Ho_Chi_Minh.

## Hạn chế đã biết

- Chưa có rate limiting hay chống spam ở tầng CSDL; sẽ xử lý ở tầng Cloudflare/Supabase trong phần thiết kế bảo mật.
- Báo cáo doanh thu theo bác sĩ chưa có; báo cáo theo dịch vụ dựa vào tiền tố mô tả của dòng hóa đơn ("Dịch vụ:", "Thuốc:", "Vaccine:").
- Nhắc lịch mới ở mức danh sách việc cần nhắc và ghi nhận thủ công; chưa tự gửi email/SMS.
- Chưa hỗ trợ nhiều chi nhánh, thanh toán trực tuyến, hay bác sĩ nghỉ phép theo ngày cụ thể (lịch làm việc theo tuần cố định).
- Bộ kiểm thử chạy trên PostgreSQL với stub Supabase; nên chạy lại các luồng chính trên Supabase thật khi triển khai.

## Cập nhật cho cơ sở dữ liệu đã cài trước đó

- `05_mfa_admin.sql`: bắt buộc mã xác thực hai lớp cho admin đã đăng ký.
- `06_mo_ta_dich_vu_va_lich_bac_si.sql`: mô tả dịch vụ và lịch làm việc công khai của bác sĩ (trang chủ).
- `07_danh_gia.sql`: đánh giá của chủ nuôi sau lần khám (chạy sau 06).
- `08_email_tai_khoan.sql`: cho admin xem email tài khoản (chạy sau 07).
- `09_chung_chi_bac_si.sql`: trình độ, kinh nghiệm, chứng chỉ của bác sĩ (chạy sau 08).
- `10_bai_viet.sql`: bài viết Góc thú y do admin quản lý (chạy sau 08).
