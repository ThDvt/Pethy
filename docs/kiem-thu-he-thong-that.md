# Danh sách kiểm thử một lượt trên hệ thống thật

Mục đích: chạy một lần đầy đủ trên web thật và Supabase thật để bắt những lỗi mà chế độ mẫu không thấy (cấu hình Supabase, gửi email, quyền dữ liệu, tải ảnh, múi giờ). Ghi kết quả vào cột cuối: Đạt, Lỗi (kèm ảnh chụp màn hình) hoặc Bỏ qua. Chỉ dùng tài khoản thử, không dùng dữ liệu của người thật.

Thời gian dự kiến: khoảng 60 đến 90 phút. Nên dùng hai trình duyệt (hoặc một cửa sổ ẩn danh) để đăng nhập hai tài khoản cùng lúc.

## 0. Chuẩn bị (làm một lần)

| Bước | Việc cần làm | Kết quả đúng |
|---|---|---|
| 0.1 | Merge các pull request đang chờ trên GitHub, đợi Cloudflare deploy xong | Trang chủ mở được, không báo lỗi |
| 0.2 | Chạy `db/06_...sql` rồi `db/07_danh_gia.sql` `db/08_email_tai_khoan.sql` và `db/09_chung_chi_bac_si.sql` trong Supabase SQL Editor (nếu chưa chạy) | Mỗi file báo Success |
| 0.3 | Mở `https://<project>.supabase.co/auth/v1/settings?apikey=<anon key>` | `email` là true, `mailer_autoconfirm` là false |
| 0.4 | Authentication, URL Configuration: Site URL là địa chỉ web thật (`pethy.bo3tuoi1999.workers.dev`) | Link trong email xác nhận mở đúng web thật, không về localhost |
| 0.5 | Đăng nhập admin, vào trang Bảo mật, bấm kiểm tra cấu hình Supabase | Mọi dòng đều đạt |
| 0.6 | Chuẩn bị 2 email thật còn dùng được để đăng ký chủ nuôi A và B (Supabase miễn phí chỉ gửi khoảng 2 email mỗi giờ) | Có sẵn hai hộp thư |

## 1. Chủ nuôi A: đăng ký và đặt lịch

| Bước | Việc cần làm | Kết quả đúng |
|---|---|---|
| 1.1 | Trang chủ, bấm "Đặt lịch khám", chọn tab Tạo tài khoản, nhập họ tên, số điện thoại, email A, mật khẩu và xác nhận mật khẩu | Báo đã gửi email xác nhận |
| 1.2 | Mở email, bấm link xác nhận, quay lại đăng nhập | Vào được khu chủ nuôi |
| 1.3 | Thú cưng, thêm một bé (tên, loài) | Bé hiện trong danh sách |
| 1.4 | Trang chủ, bấm "Chọn dịch vụ này" ở Tiêm phòng | Sang đăng nhập; sau đăng nhập, trang đặt lịch đã chọn sẵn dịch vụ |
| 1.5 | Hoàn tất đặt lịch: chọn bé, bác sĩ, ngày, giờ trống | Lịch ở trạng thái chờ xác nhận |
| 1.6 | Mở lại cùng giờ đó bằng tài khoản khác | Giờ vừa đặt không còn trong danh sách giờ trống |
| 1.7 | Đổi giờ lịch vừa đặt | Đổi được; giờ cũ được trả lại |
| 1.8 | Thử đổi hoặc hủy lịch sắp diễn ra dưới 2 tiếng (đặt một lịch gần giờ hiện tại nhờ lễ tân) | Bị từ chối, có thông báo rõ lý do |

## 2. Quản trị viên: tài khoản nhân viên

| Bước | Việc cần làm | Kết quả đúng |
|---|---|---|
| 2.1 | Đăng nhập admin (nếu đã bật xác thực hai lớp, nhập mã 6 số) | Vào được Tổng quan |
| 2.2 | Tài khoản, tạo nhân viên: bác sĩ, lễ tân, thu ngân, thủ kho (mật khẩu tạm) | Mỗi tài khoản tạo được, không treo màn hình |
| 2.3 | Đăng nhập thử từng tài khoản nhân viên bằng mật khẩu tạm | Vào đúng khu theo vai trò, không vào được khu khác |
| 2.4 | Lịch làm việc: tạo lịch cho bác sĩ vừa tạo | Giờ trống của bác sĩ hiện ra ở bước đặt lịch |
| 2.5 | Khóa một tài khoản nhân viên, đăng nhập lại bằng tài khoản đó | Không đăng nhập được hoặc bị chặn |
| 2.6 | Đổi vai trò một tài khoản, mở lại bằng tài khoản đó | Quyền đổi theo vai trò mới |

## 3. Quy trình khám (làm theo thứ tự)

| Bước | Vai trò | Việc cần làm | Kết quả đúng |
|---|---|---|---|
| 3.1 | Lễ tân | Xác nhận lịch A vừa đặt | Lịch chuyển sang đã xác nhận |
| 3.2 | Lễ tân | Đặt hộ một lịch cho khách tại quầy | Lịch được xác nhận luôn |
| 3.3 | Bác sĩ | Mở lịch, ghi cân nặng, nhiệt độ, chẩn đoán, kê đơn thuốc | Lưu được; đơn thuốc hiện đủ |
| 3.4 | Bác sĩ | Với lịch tiêm: ghi mũi tiêm, chọn vaccine | Mũi tiêm vào sổ tiêm, có ngày nhắc mũi sau |
| 3.5 | Thủ kho | Mở Tồn kho, kiểm tra thuốc vừa kê | Tồn giảm đúng số lượng đã kê |
| 3.6 | Thu ngân | Lập hóa đơn từ lần khám | Tổng tiền = giá dịch vụ + thuốc |
| 3.7 | Thu ngân | Thu một phần tiền mặt, rồi phần còn lại bằng chuyển khoản | Hóa đơn chuyển sang đã thu đủ; không thu quá số còn nợ |
| 3.8 | Chủ nuôi A | Mở Hóa đơn, Lịch sử khám | Thấy đúng hóa đơn, chẩn đoán, đơn thuốc, sổ tiêm của bé |

## 4. Kho

| Bước | Việc cần làm | Kết quả đúng |
|---|---|---|
| 4.1 | Thủ kho, Thêm thuốc vào danh mục một thuốc mới | Hộp Nhập hàng vào kho tự mở với thuốc đó đã chọn |
| 4.2 | Nhập một lô: số lô, hạn dùng, số lượng | Tồn tăng đúng; có dòng trong biến động |
| 4.3 | Nhập lô cùng số lô và cùng hạn dùng lần nữa | Số lượng cộng dồn vào lô cũ |
| 4.4 | Nhập lô với hạn dùng đã qua | Bị từ chối hoặc lô báo hết hạn |
| 4.5 | Kiểm kê, sửa số lượng một lô, ghi lý do | Tồn đổi; lý do lưu trong biến động |
| 4.6 | Đặt ngưỡng cảnh báo cao hơn tồn hiện tại | Admin thấy mục cảnh báo "Sắp hết hàng" trên dashboard |

## 5. Đánh giá

| Bước | Việc cần làm | Kết quả đúng |
|---|---|---|
| 5.1 | Chủ nuôi A đánh giá lần khám đã hoàn thành (sao và nhận xét) | Gửi được; sửa lại được |
| 5.2 | Mở trang chủ khi chưa đăng nhập | Thấy điểm trung bình và nhận xét (tên rút gọn, không lộ họ tên đầy đủ) |
| 5.3 | Admin ẩn đánh giá đó | Trang chủ không còn hiện; điểm trung bình tính lại |

## 5b. Bài viết (Góc thú y)

Cần chạy `db/10_bai_viet.sql` trong Supabase trước.

| Bước | Việc cần làm | Kết quả đúng |
|---|---|---|
| 5b.1 | Admin vào mục Bài viết, viết bài mới, để trạng thái Nháp | Bài có trong danh sách; trang chủ và trang Tin tức (khi chưa đăng nhập) không thấy bài |
| 5b.2 | Mở thẳng liên kết bài nháp khi chưa đăng nhập | Báo "Không tìm thấy bài viết" |
| 5b.3 | Admin bấm Đăng | Trang chủ hiện mục Góc thú y với bài này; trang Tin tức có bài; ngày đăng là hôm nay |
| 5b.4 | Viết thử nội dung có `## Tiêu đề`, `- mục` và chữ như `<b>x</b>` | Hiện tiêu đề nhỏ, danh sách; `<b>x</b>` hiện nguyên chữ, không in đậm |
| 5b.5 | Admin bấm Gỡ xuống rồi Đăng lại | Bài biến mất rồi hiện lại; ngày đăng giữ nguyên |
| 5b.6 | Đăng nhập tài khoản không phải admin, thử mở `/admin/bai-viet.html` | Không vào được trang quản lý |
| 5b.7 | Sửa một bài đã đăng, chọn ảnh bìa (ảnh ngang bất kỳ), Lưu; sau đó thử Gỡ ảnh và thay ảnh khác | Ảnh hiện ở thẻ trang chủ, trang Tin tức và đầu bài; gỡ hoặc thay thì ảnh cũ không còn |
| 5b.8 | Gỡ hết bài | Mục Góc thú y trên trang chủ tự ẩn |

## 6. Quản trị viên: dashboard

| Bước | Việc cần làm | Kết quả đúng |
|---|---|---|
| 6.1 | Mở Tổng quan, chọn lần lượt 7 ngày, 30 ngày, tháng này, 3 tháng, 12 tháng | Số liệu đổi; không báo lỗi |
| 6.2 | So "Đã thu" với tổng các khoản đã thu ở bước 3.7 | Khớp từng đồng |
| 6.3 | Công nợ hiện tại | Khớp với hóa đơn còn nợ |
| 6.4 | Bấm "Xem chi tiết" ở biểu đồ | Sang trang Doanh thu đúng khoảng ngày |
| 6.5 | Bấm Làm mới | Giờ cập nhật đổi |

## 7. Phân quyền và bảo mật (quan trọng nhất)

| Bước | Việc cần làm | Kết quả đúng |
|---|---|---|
| 7.1 | Đăng nhập chủ nuôi A, tự gõ địa chỉ `/admin/`, `/kho/`, `/thu-ngan/` | Bị chuyển đi hoặc báo không có quyền |
| 7.2 | Đăng ký thêm chủ nuôi B. Dùng `tools/kiem-tra-idor.html` với A và B | Dòng xanh "Không mục nào bị lộ" |
| 7.3 | Mở `tools/kiem-tra-anon.html` (khi chưa đăng nhập) | Mọi dòng đạt, trừ các thông tin công khai (dịch vụ, bác sĩ, cấu hình công khai, đánh giá) |
| 7.4 | Chủ nuôi B mở lịch hoặc hóa đơn của A bằng cách sửa mã trên địa chỉ | Không thấy dữ liệu của A |
| 7.5 | Đăng nhập sai mật khẩu nhiều lần | Có giới hạn, không cho thử vô hạn |
| 7.6 | Đăng xuất, bấm nút Back của trình duyệt | Không xem lại được trang khu trong |
| 7.7 | Để yên khu nhân viên quá thời gian chờ | Bị đăng xuất, có thông báo "phiên đã kết thúc" |

## 8. Giao diện và thiết bị

| Bước | Việc cần làm | Kết quả đúng |
|---|---|---|
| 8.1 | Mở trang chủ trên điện thoại | Không tràn ngang; khung trượt dịch vụ vuốt được (khi có hơn 3 dịch vụ) |
| 8.2 | Thu gọn và mở rộng thanh bên ở khu chủ nuôi và quản trị | Hoạt động, ghi nhớ lựa chọn |
| 8.3 | Mở Tin nhắn giữa chủ nuôi và phòng khám | Gửi và nhận được; nút Gửi thẳng hàng ô soạn |
| 8.4 | Xác nhận khi đăng xuất | Có hộp xác nhận |
| 8.5 | Ô số điện thoại | Tự định dạng khi rời ô, không nhân đôi số 0 |
| 8.6 | Admin gửi một tin cho bác sĩ. Đăng nhập bác sĩ ở cửa sổ khác | Mục Tin nhắn của bác sĩ hiện số 1 (tối đa 1 phút); mở Tin nhắn thì số biến mất |
| 8.7 | Lễ tân: có lịch chờ xác nhận. Thu ngân và chủ nuôi: có hóa đơn còn nợ. Thủ kho: có thuốc sắp hết | Mục tương ứng ở thanh bên hiện đúng số; xử lý xong thì số giảm |
| 8.8 | Thủ kho/bác sĩ: đăng nhập bác sĩ, mở Hồ sơ của tôi, chọn ảnh, nhập chuyên môn, giới thiệu, Lưu hồ sơ | Ảnh hiện tròn đều; trang chủ (chưa đăng nhập) hiện đúng ảnh ở thẻ bác sĩ. Báo "Chưa có kho ảnh" nghĩa là chưa chạy `db/04_storage.sql` |
| 8.9 | Bác sĩ: Hồ sơ của tôi, nhập trình độ, số năm kinh nghiệm, chứng chỉ (mỗi dòng một mục), Lưu. Nhập số năm 61 hoặc -1 | Lưu được; số năm sai bị chặn với thông báo rõ. Trang chủ (ẩn danh), thẻ bác sĩ, Xem thông tin: hiện đủ trình độ, kinh nghiệm, danh sách chứng chỉ |

## Khi gặp lỗi

Chụp màn hình toàn trang (có thanh địa chỉ), ghi lại bước và tài khoản đang dùng. Nếu có dòng mã lỗi trong ngoặc (ví dụ `email_provider_disabled`), chép nguyên văn. Gửi lại, kèm vai trò đang đăng nhập.

## Sau khi xong

Kết quả đạt và lỗi được tổng hợp vào chương 9 (Kiểm thử và kết quả) và chương 10 (Hạn chế) của báo cáo.
