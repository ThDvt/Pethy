# Quy chuẩn giao diện Pethy

Tài liệu này ghi lại các quy tắc giao diện mà Pethy đang theo, để các trang mới và người sau này làm cho nhất quán. Nó cũng là nguồn cho mục "Thiết kế giao diện" trong báo cáo.

## Nguồn tham khảo

Cách chia nhóm (màu, trạng thái, nút, icon, chuyển động) và nhiều nguyên tắc được tham khảo từ bộ tài liệu thiết kế của **Astryx**, hệ thống thiết kế mã nguồn mở của Meta (giấy phép MIT): https://github.com/meta/astryx, thư mục `docs/design` và `docs/families`. Pethy không dùng mã nguồn của Astryx, chỉ mượn ý tưởng và diễn đạt lại cho một trang web HTML, CSS, JS thuần. Lưu ý các tài liệu thiết kế đó tự ghi trạng thái `draft` (bản nháp), nên chúng là tham khảo, không phải tiêu chuẩn chính thức.

## 1. Màu và bề mặt

- **Ba lớp bề mặt ở khu nhân viên:** nền trang xám nhạt (`#F0F1ED`), thẻ nội dung trắng có viền và bóng nhẹ, thanh bên xanh ngọc nhạt (`#DCEBE7`). Ba lớp phải khác nhau rõ ràng.
- **Mỗi nhóm hành động chỉ có một nút chính.** Nút chính dùng màu nhấn (đỏ cam), các nút còn lại là nút phụ hoặc nút viền, để người dùng nhìn là biết việc quan trọng nhất.
- **Chữ và nền chọn cùng lúc.** Nút nền tối hoặc nền đậm dùng chữ trắng. Không để một quy tắc chung đè màu chữ lên nút (lỗi từng gặp ở nút "Đặt lịch ngay").

## 2. Màu theo trạng thái

Mỗi trạng thái luôn có **chữ** đi kèm màu, không chỉ dùng màu. Màu cố định cho toàn bộ trang:

| Màu | Ý nghĩa | Ví dụ |
| --- | --- | --- |
| Vàng | Đang chờ | Chờ xác nhận, chưa thanh toán, sắp hết thuốc |
| Xanh dương | Đã xác nhận, đang tiến hành | Lịch đã xác nhận |
| Xanh lá | Hoàn tất, ổn | Đã hoàn thành, đã thanh toán |
| Cam | Làm dở | Thanh toán một phần |
| Đỏ | Có vấn đề | Không đến, hết hạn |
| Xám | Đã hủy, ngừng | Đã hủy |

Ánh xạ mã trạng thái sang màu nằm ở một chỗ duy nhất (`MAU_TT` trong `web/js/app.js`), các trang gọi `Pethy.tt(ma, nhan)` chứ không tự chọn màu.

## 3. Nút

- Có hai kiểu: `.nut` (nút lớn, chính hoặc phụ) và `.lien-ket` (nút viền nhỏ cho thao tác trong bảng, danh sách). **Không dùng chữ gạch chân làm nút.**
- Nút chỉ có icon phải có `aria-label` và `title` (ví dụ nút làm mới).
- Vùng bấm tối thiểu 44px trên điện thoại.
- Nút bị vô hiệu hóa thì không phản hồi khi rê hoặc bấm.
- Thao tác nguy hiểm (khóa tài khoản, hủy) dùng biến thể `nguy` (đỏ) và chỉ hiện khi thao tác còn áp dụng được.

## 4. Icon

- Dùng một bộ duy nhất: **Lucide** (ISC), nét 2px, đầu và góc bo tròn, khung 24×24, nhúng thẳng vào mã, không tải từ ngoài (hợp với chính sách bảo mật CSP).
- Icon lấy màu từ chữ xung quanh (`currentColor`). Kích thước theo vai trò: 20px trong thanh bên, 18 đến 20px trong nút.
- Icon trong nút tròn phải được căn theo **trọng tâm hình**, không chỉ theo khung (nút gửi tin nhắn được nhích 0,75px vì máy bay giấy nặng bên trái).
- Nguồn và giấy phép ghi trong `web/img/NGUON-ANH.md`.

## 5. Chuyển động

- Chuyển động chỉ để báo phản hồi (rê chuột, bấm), nhẹ và nhanh, khoảng 0,2 đến 0,3 giây.
- Mọi hiệu ứng phải tắt khi người dùng bật chế độ giảm chuyển động (`prefers-reduced-motion`).
- Trạng thái không được phụ thuộc vào chuyển động, và hiệu ứng không được làm xê dịch bố cục.
- Hiệu ứng rê chuột chỉ là phần thêm: điện thoại và bàn phím vẫn phải hiểu được trạng thái.

## 6. Cập nhật tự động không phá việc người dùng đang làm

Từ khi có cập nhật thời gian thực, mọi trang phải:
- Hoãn làm mới khi người dùng đang gõ hoặc đang mở hộp thoại (`Pethy.khiDoi`).
- Giữ nguyên các mục đang mở (`<details>`) khi dựng lại danh sách, nhận diện bằng `data-id` (đã áp dụng ở trang Hóa đơn và Kho sau khi test e2e phát hiện lỗi).

## Kết quả rà soát (ngày 09/11/2026)

Rà soát bằng cách đọc mã CSS và JS, và tính tỷ lệ tương phản WCAG cho các cặp màu chính. Chưa chạy công cụ kiểm tra trên trang thật.

| Nguyên tắc (Astryx) | Kết quả |
| --- | --- |
| Trạng thái không chỉ dựa vào màu | Đạt: nhãn trạng thái luôn có chữ |
| Độ tương phản chữ và nền (cần 4,5:1) | Đạt cho 15 cặp màu chính (chữ thường, chữ mờ, thanh bên, nút, sáu nhãn trạng thái; thấp nhất 4,65:1). Màu xanh lá của biểu đồ chỉ đạt 2,82:1 (cần 3:1 cho đồ họa), đã đổi từ `#1baf7a` sang `#14a06e` (3,34:1) |
| Nút chỉ có icon có tên truy cập | Đạt: nút gửi, quay lại, mắt mật khẩu, làm mới và hai liên kết mạng xã hội đều có `aria-label` |
| Vùng bấm tối thiểu 44px trên điện thoại | Có lỗi: nút thu gọn thanh bên (28px), nút làm mới (36px), nút viền nhỏ (36 đến 38px) và nút quay lại tin nhắn (40px) dưới 44px. Đã nới lên 44px trên màn hình cảm ứng |
| Giảm chuyển động vẫn giữ nghĩa | Có `prefers-reduced-motion` trong 5 tệp CSS; mọi hiệu ứng icon mới đều có nhánh tắt |
| Trạng thái chờ giữ nguyên kích thước | Một phần: mọi trang dùng khung chờ dạng skeleton có chiều cao cố định (`.trang-thai-tai`, 248px hoặc 392px) nên không còn nhảy chữ "Đang tải…", nhưng danh sách thật cao hơn hay thấp hơn khung chờ thì nội dung bên dưới vẫn dịch một lần khi tải xong. Chưa đo từng trang |
| Một nút chính trong mỗi nhóm hành động | Đã xem mã các tệp có từ hai nút chính trở lên (đặt lịch, thu ngân, khám bệnh, khách hàng, bảo mật, đăng nhập): các nút nằm ở từng bước, từng hộp thoại hoặc từng dòng danh sách khác nhau, chưa thấy trường hợp hai nút chính đứng cạnh nhau. Chưa xem bằng mắt trên trang thật |
