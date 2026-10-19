# Tiến độ dự án Pethy (cập nhật 16/10/2026, chiều)

## Đã xong
- Cơ sở dữ liệu: 23 bảng, 26 hàm nghiệp vụ gọi được từ trình duyệt, RLS, lưu trữ ảnh. 279/279 kiểm thử đạt (db/test/10, 11, 12).
- Thiết kế giao diện: 8 màn hình trên canvas thiết kế (artifact https://claude.ai/artifact/VM64PsPY5aUbCFG4Qmw7n8).
- Thiết kế bảo mật: docs/thiet-ke-bao-mat.md.
- Báo cáo (tài liệu Docs): https://claude.ai/code/artifact/89e87062-3ecb-4a7d-9777-5b81a3e0b3ba
  - Đã viết và được duyệt: chương 1 Giới thiệu, 2 Phân tích yêu cầu, 3 Kiến trúc và công nghệ, 4 Thiết kế cơ sở dữ liệu.
  - Chương 5 Bảo mật đã viết vào tài liệu và gửi người dùng duyệt trong chat (chờ "ổn").
  - Đang chờ viết: 6 Giao diện, 9 Kiểm thử và kết quả, 10 Đánh giá, Phụ lục.
  - Để trống đến khi làm xong thật: 7 Cài đặt giao diện, 8 Triển khai lên internet.

## Hình đã vẽ (mã tạo hình ở docs/img-src, chạy lại bằng python3 -I và dot)
- 2.1 BFD đầy đủ (một hình, từ trên xuống), 2.2 luồng một lượt khám
- 3.1 kiến trúc
- 4.1 đến 4.4 sơ đồ quan hệ, 4.5 trạng thái lịch hẹn, 4.6 kho theo lô
- 5.1 bốn lớp phòng thủ (thứ tự: Ứng dụng, Biên, Xác thực, Dữ liệu)
- Các hình hiện là file ảnh, CHƯA nhúng vào tài liệu báo cáo; nhúng một lượt sau khi viết xong các chương.
- Còn phải vẽ: sơ đồ điều hướng theo vai trò (chương 6), sơ đồ triển khai (chương 8).

## Quy ước đã chốt với người dùng
- Xong phần nào chuyển phần đó. Mỗi chương gửi nội dung ngay trong chat để duyệt, vì người dùng xem bằng iPhone và không mở được tài liệu.
- Sơ đồ vẽ từ trên xuống; sơ đồ phân rã chức năng ghép thành một hình.
- Nội dung chương không quá ngắn gọn.
- Không có nhóm quản lý nhân sự đầy đủ (để ở hướng phát triển, chương 10).
- Giao diện tránh dấu hiệu "AI làm": ít bo góc, không gradient, không lạm dụng icon.

## Việc kế tiếp
1. Chờ người dùng duyệt chương 5, rồi viết chương 6 (giao diện, kèm sơ đồ điều hướng).
2. Chương 9, 10, phụ lục.
3. Phát triển giao diện thật, triển khai (Supabase, Cloudflare Pages, SMTP, CAPTCHA), viết chương 7 và 8.
4. Nhúng hình vào tài liệu, đưa dự án lên GitHub, làm đẹp hồ sơ cá nhân.

## Lưu ý kỹ thuật
- Môi trường thử PostgreSQL cục bộ chết giữa các lượt; khởi động lại bằng bash db/test/start_pg.sh rồi db/test/reset.sh.
- db/test/start_pg.sh và 12_security.sql đã có trong thư mục nhưng cần lưu lại nếu chưa có trong dự án.


## Cập nhật 16/10 (chiều tối)
- Chương 5 đã được duyệt. Chương 6 (Thiết kế giao diện) đã viết vào tài liệu, Hình 6.1 (img-src/nav.py) đã gửi, đang chờ duyệt.
- Khoảng trống: chưa có màn hình thu ngân (lập hóa đơn, thu tiền).
- Còn dữ liệu mẫu và chỗ giữ chỗ ([ĐỊA CHỈ PHÒNG KHÁM]...) cần điền khi triển khai.
- Câu hỏi mở: lễ tân 'Từ chối' = hủy lịch kèm lý do; bác sĩ xem mọi lịch nhưng chỉ ghi hồ sơ của mình.
- Tiếp theo: chương 9, 10, phụ lục; sau đó phát triển và triển khai thật (chương 7, 8).

## Cập nhật 16/10 (tối)
- Đã thiết kế màn hình thu ngân (màn 9, canvas Pethy – Thiết kế giao diện); sửa màn lễ tân bỏ trạng thái "Đang khám" (không có trong CSDL).
- Hình 6.1 vẽ lại với khu Thu ngân; chương 6 đã cập nhật thành 9 màn hình.
- Chủ dự án đồng ý: lễ tân "Từ chối" = hủy lịch kèm lý do; bác sĩ xem mọi lịch nhưng chỉ ghi hồ sơ của mình.
- Chờ duyệt chương 6, sau đó viết chương 9.

## Cập nhật 16/10 (20:50)
- Chương 6 đã được duyệt. Chương 9 (Kiểm thử và kết quả) đã viết, đang chờ duyệt. Đã chạy lại bộ kiểm thử trên CSDL dựng mới: 151 + 75 + 53 = 279 đạt, 0 lỗi.
- Tiếp theo: chương 10 (đánh giá, hạn chế, hướng phát triển), phụ lục; rồi phát triển và triển khai thật.

## Cập nhật 16/10 (tối muộn)
- Chương 9 đã duyệt. Chương 10 (Đánh giá, hạn chế, hướng phát triển) đã viết, chờ duyệt. Tiếp theo: phụ lục.

## Cập nhật 17/10 (sáng)
- Chương 10 đã duyệt. Phụ lục (A–G) đã có trong tài liệu, chờ duyệt.
- Lưu ý bảo mật từ chủ dự án: tránh lỗi lộ dữ liệu ở frontend của web vibecode. Khi triển khai: kiểm service_role không nằm trong mã giao diện, cấu hình Auth, quyền Storage, schema mở qua API; tự tấn công thử bằng khóa công khai (đề xuất thêm vào chương 8).
- Còn lại: duyệt phụ lục; phát triển giao diện; triển khai (Supabase, Cloudflare Pages, SMTP, chống bot, _headers/CSP, MFA admin, sao lưu); chương 7 và 8; chèn hình vào tài liệu; GitHub; hồ sơ cá nhân.

## Cập nhật 17/10 (cài đặt giao diện, bước 1)
- Bắt đầu giai đoạn cài đặt: thư mục web/ (index.html, dang-nhap.html, css/pethy.css, js/app.js, js/config.js, js/trang-chu.js, js/dang-nhap.js).
- Đã xem trên trình duyệt ở chế độ dữ liệu mẫu (chưa nối Supabase). Chưa có URL và khóa anon thật; js/config.js để trống.
- Thư viện supabase-js nạp từ CDN jsdelivr phiên bản 2.45.4 (npm bị chặn mạng trong phiên này). Cần thêm SRI và CSP khi triển khai.
- Điểm lệch so với bản thiết kế: trang chủ không hiện khung giờ trống cho khách vì CSDL chỉ cho chủ nuôi và lễ tân gọi khung_gio_trong; thay bằng khối "Đặt lịch gồm ba bước". Giờ mở cửa và liên hệ còn là chỗ giữ chỗ.
- Tiếp theo: khu chủ nuôi (tổng quan, đặt lịch, thú cưng), rồi lễ tân, bác sĩ, thu ngân, kho, admin.

## Cập nhật 17/10 (khu chủ nuôi)
- Đã làm khu chủ nuôi: Tổng quan (lịch sắp tới, đổi/hủy lịch theo hạn 2 giờ, mũi tiêm sắp đến hạn), Đặt lịch 3 bước (thú cưng, dịch vụ, vaccine, bác sĩ; ngày và giờ trống; xác nhận), đổi lịch (?doi=), Thú cưng (xem, thêm).
- Kiểm tra: chạy bằng dữ liệu mẫu (js/mau.js, chỉ localhost với ?mau=1), thử luồng đặt lịch từ đầu đến cuối bằng trình duyệt tự động, khổ 390 px. Chưa chạy với Supabase thật.
- Chưa làm: hóa đơn của chủ nuôi, sửa/xóa thú cưng, quên mật khẩu.
- Tiếp theo: khu lễ tân, rồi bác sĩ, thu ngân, kho, admin.
- 17/10: chủ dự án góp ý không dùng dấu chấm giữa dòng làm dấu phân cách. Đã bỏ khỏi toàn bộ giao diện thật (web/): tiêu đề dùng gạch ngang, thông tin tách dòng hoặc dùng dấu phẩy. Canvas thiết kế 9 màn hình vẫn còn dùng dấu này (chờ quyết định có sửa không).
- 17/10: đã bỏ dấu chấm giữa dòng khỏi cả canvas thiết kế 9 màn hình (thay bằng dấu phẩy). Tiếp theo: khu lễ tân.

## Cập nhật 17/10 (khu lễ tân)
- Đã làm trang Lịch trong ngày của lễ tân (web/le-tan/index.html, js/le-tan.js): danh sách cần xác nhận (xác nhận, từ chối = hủy kèm lý do), bảng lịch hôm nay có dòng "Bây giờ" và nút "Đánh dấu không đến" cho lịch đã qua giờ, cột việc cần nhắc (đã gọi, đã email).
- Kiểm tra bằng dữ liệu mẫu (?mau=1&vt=le_tan) ở khổ 1280 px. Chưa chạy với Supabase thật.
- Chưa làm trong khu lễ tân: Đặt lịch hộ, Khách hàng.
- Tiếp theo: khu bác sĩ (lịch khám, ghi hồ sơ, kê đơn), thu ngân, kho, admin.

## Cập nhật: khu bác sĩ (giai đoạn cài đặt)
- Đã xong: danh sách lịch khám của tôi (hôm nay và 7 ngày tới, gom theo ngày), trang khám (thông tin thú cưng, lịch sử khám qua xem_ho_so_kham, cân nặng, nhiệt độ, chẩn đoán, ghi chú), kê đơn nhiều dòng thuốc có hiển thị tồn kho, khối ghi mũi tiêm (ghi_tiem) cho dịch vụ tiêm phòng.
- Lưu hồ sơ gọi ghi_ho_so_kham rồi ke_don; lỗi từ cơ sở dữ liệu được hiển thị bằng tiếng Việt.
- Mới thử trên dữ liệu mẫu (localhost, ?mau=1), chưa thử với Supabase thật.
- Còn lại: thu ngân, thủ kho, quản trị, lễ tân (đặt lịch hộ, khách hàng), chủ nuôi (hóa đơn).

## Cập nhật: khu thu ngân (giai đoạn cài đặt)
- Đã xong: trang Thu ngân gồm ba nhóm (chờ lập hóa đơn, chờ thanh toán, đã thanh toán trong 7 ngày), hộp chi tiết hóa đơn (các dòng chi phí, các lần đã thu, số còn lại), thu tiền nhiều lần bằng tiền mặt hoặc chuyển khoản (ghi_thanh_toan), hủy hóa đơn chưa có thanh toán (huy_hoa_don), cột "Thu hôm nay" lấy từ doanh_thu_theo_ngay.
- Kiểm tra số tiền ở giao diện chỉ để báo lỗi sớm; ràng buộc thật (không thu vượt số còn lại, không hủy hóa đơn đã có thanh toán) nằm trong hàm của cơ sở dữ liệu.
- Mới thử trên dữ liệu mẫu, chưa thử với Supabase thật.
- Còn lại: thủ kho, quản trị, lễ tân (đặt lịch hộ, khách hàng), chủ nuôi (hóa đơn).

## Cập nhật: khu thủ kho (giai đoạn cài đặt)
- Đã xong: bảng tồn kho theo thuốc và vaccine (bấm để xem từng lô, hạn dùng, tồn), nhập kho (nhap_kho), điều chỉnh kiểm kê bắt buộc ghi lý do (dieu_chinh_kho), thêm thuốc mới vào danh mục, lịch sử biến động gần đây, cột cảnh báo (sắp hết hàng, lô sắp hết hạn, lô hết hạn còn tồn) lấy từ canh_bao_kho.
- Mọi thay đổi tồn kho đều đi qua hàm trong cơ sở dữ liệu và được ghi thành biến động, giao diện không sửa số tồn trực tiếp.
- Mới thử trên dữ liệu mẫu, chưa thử với Supabase thật.
- Còn lại: quản trị, lễ tân (đặt lịch hộ, khách hàng), chủ nuôi (hóa đơn).

## Cập nhật: khu quản trị (giai đoạn cài đặt)
- Đã xong tám trang: Tổng quan (thu hôm nay, thu tháng, lịch hôm nay, công nợ, cảnh báo kho), Doanh thu (theo tháng và theo dịch vụ, thuốc, vaccine, chọn khoảng ngày), Tài khoản (đổi vai trò, khóa, mở khóa, xóa; không tự đổi hay tự khóa chính mình), Dịch vụ và giá, Lịch làm việc của bác sĩ, Tham số hệ thống (gồm bật tắt bảo trì), Nhật ký (lọc theo hành động), Trao đổi nội bộ với từng nhân viên.
- Các thao tác nhạy cảm (đổi vai trò, khóa, xóa) đều hỏi xác nhận và đi qua hàm trong cơ sở dữ liệu; quyền thật nằm ở RLS và hàm, giao diện chỉ là lớp hiển thị.
- Trang trao đổi nội bộ làm mới mỗi 15 giây và giữ nguyên nội dung đang gõ; chưa dùng Realtime.
- Mới thử trên dữ liệu mẫu, chưa thử với Supabase thật.
- Còn lại: lễ tân (đặt lịch hộ, khách hàng), chủ nuôi (hóa đơn), trao đổi nội bộ cho nhân viên các khu khác.

## Cập nhật: hoàn thiện các phần còn lại của giao diện
- Lễ tân: trang Khách hàng (tìm theo tên hoặc số điện thoại, thêm khách đến trực tiếp, thêm thú cưng cho khách) và Đặt lịch hộ (dùng chung luồng ba bước với chủ nuôi, lịch do lễ tân đặt được xác nhận luôn).
- Chủ nuôi: trang Hóa đơn (danh sách, chi tiết từng dòng, các lần đã trả, số còn lại).
- Mọi nhân viên (lễ tân, bác sĩ, thu ngân, thủ kho): trang Trao đổi với quản trị, mỗi người một luồng riêng; menu của bốn vai nhân viên được gom về một chỗ trong khu.js.
- Chưa làm (để ngỏ, ghi vào phạm vi mở rộng): gộp hồ sơ khách trực tiếp với tài khoản (hàm gop_chu_nuoi đã có ở cơ sở dữ liệu), sửa hoặc xóa thú cưng, quên mật khẩu.
- Toàn bộ giao diện mới thử trên dữ liệu mẫu. Bước tiếp theo là dựng Supabase thật và kiểm thử tích hợp.

## Cập nhật: dựng cơ sở dữ liệu thật và chuẩn bị triển khai
- Đã chạy bốn file SQL trên Supabase thật (project của tác giả), tạo tài khoản admin đầu tiên bằng bảng điều khiển Supabase.
- Đã chạy tools/kiem-tra-anon.html bằng khóa anon từ trình duyệt: không mục nào bị lộ (30 bảng và view, thử sửa vai trò, 5 hàm nhạy cảm).
- Đã thêm web/_headers (CSP, chống nhúng khung, HSTS), trang 404, robots.txt; thay các chỗ giữ chỗ bằng thông tin liên hệ thật của phòng khám.
- Mã nguồn đã commit vào nhánh them-ma-nguon-pethy của kho ThDvt/Pethy ở máy phiên làm việc nhưng chưa đẩy được vì ứng dụng GitHub của Claude chưa được cấp quyền ghi.
- Còn lại: triển khai Cloudflare Pages, thử toàn bộ luồng nghiệp vụ trên hệ thống thật, đưa thư viện Supabase về tự lưu trữ hoặc thêm SRI, viết chương 7 và 8, chèn hình vào báo cáo, hoàn thiện profile GitHub.

## Cập nhật: củng cố bảo mật trong khuôn khổ miễn phí
- Rà soát 20 điểm kiểm tra bảo mật (docs/ra-soat-20-diem-bao-mat.md): 9 đạt, 2 chờ kiểm tra sau triển khai, 7 một phần, 2 chưa đạt theo đúng nghĩa (sao lưu tự động của Supabase và cookie httpOnly, do giới hạn gói miễn phí và kiến trúc không có máy chủ).
- Đã bổ sung: tự đăng xuất khi không thao tác, xác thực hai lớp cho admin (có ràng buộc ở cơ sở dữ liệu, 288 kiểm thử đạt), công cụ thử IDOR bằng hai tài khoản, quy trình sao lưu hằng ngày bằng GitHub Actions.

## Cập nhật 19/10/2026: đã deploy, đang làm hiệu ứng chuyển động (tạm dừng để chuẩn bị thuyết trình)

Đã xong: web đã deploy lên Cloudflare Pages, admin đã bật xác thực hai lớp. Người dùng thử web và nhận xét giao diện bị "giật": bấm nút là đổi trang tĩnh, không có hiệu ứng chờ.

Đã viết nhưng CHƯA kiểm tra bằng trình duyệt và CHƯA deploy (nằm trên nhánh `chuyen-dong-nhap`):
- `web/css/chuyen-dong.css`: chuyển trang mờ dần (View Transitions), thanh bên đứng yên, hiện dần theo thứ tự khi dữ liệu về, nút nhấn có bóng cứng khi rê chuột, hộp thoại hiện và đóng mượt, skeleton thay chữ "Đang tải…" (bản `co-the` có khung thẻ số liệu cho admin tổng quan và doanh thu), tắt hết khi người dùng chọn giảm chuyển động.
- `web/js/chuyen-dong.js`: thanh tiến trình đầu trang khi bấm liên kết, vòng xoay trên nút đang gửi, mục trang chủ hiện dần khi cuộn.
- `web/js/thanh-ben-som.js`: dựng thanh bên ngay từ thực đơn đã lưu (sessionStorage `pethy.menu`) để không chờ kiểm tra vai trò.
- `web/js/khu.js`: `khoiDong` dựng thanh bên trước khi kiểm tra vai trò, lưu và xóa thực đơn khi đăng xuất. `web/js/app.js`: xóa thực đơn khi đăng xuất.
- 24 trang HTML đã gắn thêm file CSS/JS mới, preconnect tới Google Fonts và jsdelivr.

Việc còn lại: chạy Playwright chụp ảnh các trang để kiểm tra skeleton và hiệu ứng (đặc biệt `.co-the`, hộp thoại, thanh bên), sửa lỗi nếu có, đóng gói zip, người dùng upload lại lên Cloudflare Pages. Sau đó: thử luồng thật với Supabase, chương 7 và 8, hồ sơ GitHub cá nhân.

Ngày 20/10/2026: người dùng thuyết trình đợt 1 trước lớp (tổng quan dự án, công nghệ, nói qua thiết kế hệ thống).
