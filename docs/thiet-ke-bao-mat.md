# Thiết kế bảo mật và phòng thủ tấn công — Pethy

Phạm vi: website quản lý một phòng khám thú y nhỏ, chạy thật trên internet. Kiến trúc: trang tĩnh (HTML/CSS/JS thuần) trên Cloudflare Pages, gọi trực tiếp Supabase (Auth, PostgreSQL, RLS, Storage). Vì không có máy chủ ứng dụng riêng, nguyên tắc xuyên suốt là: **mọi quyết định về quyền nằm ở cơ sở dữ liệu, giao diện chỉ là lớp tiện lợi**.

## 1. Tài sản cần bảo vệ và tác nhân đe dọa

| Tài sản | Vì sao quan trọng |
|---|---|
| Hồ sơ khám, đơn thuốc, thông tin liên hệ chủ nuôi | Dữ liệu cá nhân, lộ là mất uy tín và có thể vi phạm quy định bảo vệ dữ liệu cá nhân |
| Tiền: hóa đơn, thanh toán, công nợ | Sửa hoặc xóa là gian lận, báo cáo sai |
| Kho thuốc, vaccine | Sai tồn kho dẫn đến kê thuốc không có, thất thoát |
| Tài khoản nhân viên và admin | Chiếm được admin là chiếm cả hệ thống |
| Khả năng phục vụ (lịch hẹn) | Sập hoặc bị chiếm hết giờ trống thì phòng khám mất khách |

Tác nhân: người lạ trên internet (quét, spam, dò mật khẩu), chủ nuôi có ác ý (xem dữ liệu người khác, chiếm giờ), nhân viên làm quá quyền, tài khoản nhân viên bị lộ mật khẩu.

## 2. Bốn lớp phòng thủ

1. **Ứng dụng (trình duyệt)**: chống chèn mã, tiêu đề bảo mật, không để lộ bí mật.
2. **Biên (Cloudflare)**: chặn lưu lượng bất thường trước khi tới trang.
3. **Xác thực (Supabase Auth)**: giới hạn tần suất, CAPTCHA (Cloudflare Turnstile). Xác nhận email được tắt có chủ đích: gói Free chỉ gửi khoảng 2 thư mỗi giờ nên không dùng được thực tế; đánh đổi là không kiểm tra được chủ sở hữu email, được bù bằng Turnstile.
4. **Dữ liệu (PostgreSQL)**: RLS, quyền theo cột, hàm nghiệp vụ, bảng chỉ-thêm, nhật ký. **Lớp này đã làm xong và kiểm thử 279 trường hợp.**

## 3. Từng kiểu tấn công và cách phòng thủ

| Kiểu tấn công | Cách phòng thủ | Trạng thái |
|---|---|---|
| **Spam F5 làm sập** | Trang là tệp tĩnh phát qua CDN của Cloudflare nên F5 không chạm cơ sở dữ liệu; Cloudflare tự giảm thiểu DDoS. Trang chủ chỉ đọc ít dữ liệu công khai (dịch vụ, bác sĩ, cấu hình) và lưu tạm trong phiên để F5 không gọi lại. Thêm một luật giới hạn tần suất trên Cloudflare | Cần cấu hình và viết mã |
| **Lưu lượng dồn vào API Supabase** (không đi qua Cloudflare) | Hạn chế dữ liệu khách chưa đăng nhập đọc được (đã giới hạn ở 3 nguồn); Supabase có giới hạn riêng. Khi bị tấn công có thể bật chế độ bảo trì để chặn mọi vai trò trừ admin | Giảm thiểu, **không loại bỏ hoàn toàn** |
| **Dò mật khẩu, nhồi thông tin đăng nhập** | Supabase giới hạn theo IP (mặc định 30 yêu cầu đăng ký/đăng nhập mỗi 5 phút, trả lỗi 429); CAPTCHA ở đăng nhập, đăng ký, quên mật khẩu; thông báo lỗi chung "Email hoặc mật khẩu không đúng" để không lộ tài khoản nào tồn tại; mật khẩu tối thiểu dài; admin bật xác thực hai lớp | Cần cấu hình |
| **Đăng ký hàng loạt tài khoản giả** | Cloudflare Turnstile ở đăng ký và đăng nhập (đã tích hợp, cần site key và secret key); xác nhận email tắt có chủ đích; giới hạn theo IP; tài khoản mới luôn chỉ là chủ nuôi (trigger bỏ qua mọi vai trò client gửi lên) | Vai trò đã có; phần còn lại cần cấu hình |
| **Làm cạn hạn mức email** | Dịch vụ email mặc định của Supabase chỉ gửi 2 email mỗi giờ cho cả dự án, kẻ tấn công kích hoạt gửi liên tục thì người thật không đăng ký được. Phải dùng SMTP riêng khi chạy thật | Cần cấu hình |
| **Chiếm hết giờ trống** | Tối đa 5 lịch chưa diễn ra mỗi chủ nuôi; lễ tân xác nhận; phải đặt cách giờ hiện tại tối thiểu 2 giờ; hủy sát giờ bị chặn; ghi nhận "không đến". Có thể bổ sung: tự hủy lịch chờ xác nhận quá hạn | Đã có phần lớn |
| **Xem hoặc sửa dữ liệu người khác (IDOR)** | RLS theo chủ sở hữu trên mọi bảng; quyền ghi theo cột; ghi giao dịch chỉ qua hàm; hàm kiểm tra vai trò và quyền sở hữu bên trong. Đã kiểm thử cô lập giữa chủ nuôi, giữa nhân viên | **Đã có, đã kiểm thử** |
| **Tự nâng quyền** | Cột vai trò và trạng thái không ghi trực tiếp được; đổi vai trò chỉ qua hàm của admin; admin không tự đổi, khóa hay xóa chính mình | **Đã có, đã kiểm thử** |
| **Sửa bằng chứng tiền, kho, nhật ký** | Thanh toán, sổ kho, nhật ký, tin nhắn chỉ thêm (trigger chặn sửa, xóa, truncate, kể cả admin); sai thì ghi dòng điều chỉnh | **Đã có, đã kiểm thử** |
| **Lạm dụng hàm nghiệp vụ** (xem giờ trống, đặt, đổi, hủy lặp liên tục) | Giới hạn tần suất theo người dùng ngay trong hàm: xem giờ trống 30 lần mỗi phút, đặt, đổi, hủy 10 lần mỗi phút; nhân viên và admin không bị giới hạn. Tính theo lần gọi thành công | **Đã có, đã kiểm thử** |
| **Nhân viên tò mò xem hồ sơ khách** | Bác sĩ và admin không đọc trực tiếp hồ sơ khám và đơn thuốc, chỉ qua hàm `xem_ho_so_kham`, mỗi lần mở một hồ sơ ghi một dòng vào nhật ký (ai, hồ sơ nào, lúc nào) | **Đã có, đã kiểm thử** |
| **Quên bật RLS khi thêm bảng mới** | Bài kiểm tra tự động quét mọi bảng, quyền của khách và người đăng nhập, cố định `search_path` của hàm; có kiểm tra đột biến (thêm bảng thiếu RLS thì test đỏ) | **Đã có** |
| **Chèn SQL** | Giao diện chỉ gọi API tham số hóa của Supabase và hàm có kiểu dữ liệu rõ; dữ liệu đơn thuốc dạng JSON được kiểm tra định dạng | Đã có |
| **Chèn mã (XSS)** | Mọi dữ liệu người dùng nhập (tên thú cưng, chẩn đoán, tin nhắn) hiển thị bằng `textContent`, không bao giờ gán vào `innerHTML`; Content-Security-Policy chỉ cho chạy mã từ chính trang và kết nối tới Supabase | Cần viết mã và cấu hình |
| **Nhúng trang vào khung (clickjacking), nghe lén** | Tiêu đề `frame-ancestors 'none'`, HSTS, `Referrer-Policy`, `X-Content-Type-Options`; Cloudflare ép HTTPS | Cần cấu hình |
| **Lộ khóa bí mật** | Trình duyệt chỉ có khóa công khai `anon` (an toàn nhờ RLS); khóa `service_role` và mật khẩu CSDL không bao giờ vào mã nguồn hay GitHub; có `.gitignore` và bật quét bí mật của GitHub | Cần thực hiện khi đưa lên GitHub |
| **Chiếm tài khoản nhân viên** | Mật khẩu mạnh, xác thực hai lớp cho admin, khóa tài khoản ngay khi nghi ngờ, nhật ký thao tác để truy vết, bật bảo trì làm công tắc khẩn cấp | Một phần đã có |
| **Spam trong chat nội bộ** | Chỉ nhân viên và admin dùng; tối đa 20 tin mỗi phút, 1000 ký tự, chỉ văn bản | **Đã có, đã kiểm thử** |
| **Mất dữ liệu** | Gói miễn phí không có sao lưu theo thời điểm đáng tin cậy, cần xuất dữ liệu định kỳ (ví dụ lịch tự động hằng tuần) và thử khôi phục một lần | Cần làm trước khi chạy thật |
| **Dự án bị tạm dừng do ít hoạt động** | Gói miễn phí tự tạm dừng sau một thời gian không dùng; thêm lịch gọi nhẹ định kỳ hoặc nâng gói | Cần làm |

## 3B. Các kiểu tấn công khác đã rà soát

| Kiểu tấn công | Xử lý |
|---|---|
| CSRF | Supabase dùng token gửi kèm mỗi yêu cầu, không dựa vào cookie nên rủi ro thấp |
| Dùng lại token của tài khoản đã khóa | Mọi hàm và chính sách RLS tra lại trạng thái tài khoản mỗi lần gọi nên khóa có hiệu lực ngay |
| Sửa giá khi thanh toán | Giá do máy chủ chép lúc lập hóa đơn |
| Tải file độc hại lên kho ảnh | Chỉ JPEG, PNG, WebP tối đa 2 MB, chỉ vào thư mục của chính mình, không nhận SVG |
| Nghe lén kênh thời gian thực | Nhận tin chịu cùng chính sách RLS |
| Đánh cắp phiên qua XSS | CSP, hiển thị chữ thuần, token ngắn hạn (cần cấu hình) |
| Chuyển hướng giả mạo sau đăng nhập | Danh sách địa chỉ chuyển hướng cho phép chỉ gồm tên miền của mình (cần cấu hình) |
| Chuỗi cung ứng (thư viện, script ngoài) | Ghim phiên bản `supabase-js`, dùng SRI hoặc tự lưu bản sao (cần làm khi viết giao diện) |
| Chiếm tài khoản quản trị dịch vụ (Cloudflare, Supabase, GitHub, email) | Bật xác thực hai lớp cho cả bốn (cần làm) |
| Lừa đảo nhân viên bằng trang đăng nhập giả | Chỉ đăng nhập ở tên miền chính thức, admin dùng xác thực hai lớp |
| Lộ bản sao lưu | Mã hóa, không để trong kho GitHub công khai |

## 4. Những gì cố ý không làm (ghi trong phần hạn chế của báo cáo)

- Không tự dựng máy chủ lọc lưu lượng riêng; chấp nhận giới hạn của gói miễn phí.
- Không chống được hoàn toàn một cuộc DDoS lớn nhắm thẳng vào API Supabase; đã có công tắc bảo trì và theo dõi để phản ứng.
- Chưa có xác thực hai lớp bắt buộc cho mọi nhân viên, chỉ bắt buộc với admin.
- Dữ liệu cá nhân: cần trang chính sách quyền riêng tư và xin đồng ý khi đăng ký; nên đối chiếu với quy định hiện hành về bảo vệ dữ liệu cá nhân của Việt Nam.

## 5. Danh sách cần làm trước khi chạy thật (theo thứ tự ưu tiên)

1. Tắt đăng nhập ẩn danh. Xác nhận email: đã quyết định tắt (xem mục 1); chỉ bật lại nếu cấu hình SMTP riêng.
2. Bật CAPTCHA (Cloudflare Turnstile) cho đăng nhập và đăng ký: mã đã có, chỉ còn tạo site Turnstile, điền `TURNSTILE_SITE_KEY` trong `web/js/config.js` và dán secret key vào Supabase. Quên mật khẩu đã có (`dang-nhap.html`): luôn trả một thông báo chung dù email có tồn tại hay không, kèm Turnstile, liên kết trong thư dùng một lần.
3. Thêm luật giới hạn tần suất trên Cloudflare và bật chế độ chống bot cơ bản.
4. Thêm tiêu đề bảo mật và Content-Security-Policy qua tệp `_headers` của Cloudflare Pages.
5. Bật xác thực hai lớp cho admin; đặt tên miền và địa chỉ chuyển hướng cho phép trong Supabase.
6. Viết giao diện theo quy tắc: hiển thị chữ thuần, thông báo lỗi chung, lưu tạm dữ liệu công khai.
7. Dựng lịch sao lưu định kỳ và lịch giữ dự án hoạt động.
8. Kiểm tra bảo mật trước khi mở: thử dùng khóa `anon` đọc mọi bảng, thử gọi hàm không đủ quyền, quét tiêu đề bảo mật trang, đọc lại nhật ký.

## 6. Kiểm thử đã có và còn thiếu

Đã có: 279 kiểm thử trên cơ sở dữ liệu (quyền từng vai trò, cô lập dữ liệu, đặt trùng giờ đồng thời, bảng chỉ-thêm, bảo trì, tài khoản khóa, trigger đăng ký, giới hạn tần suất, nhật ký xem hồ sơ, quét RLS và quyền). Còn thiếu và sẽ làm sau khi có giao diện: kiểm thử qua trình duyệt thật với khóa `anon` trên Supabase thật, kiểm tra tiêu đề bảo mật, thử giới hạn tần suất.

## Nguồn

- Giới hạn mặc định của Supabase Auth: https://supabase.com/docs/guides/auth/rate-limits
- Giới hạn tần suất của Cloudflare gói miễn phí (một luật, các mốc 10/30/60 giây): https://eastondev.com/blog/en/posts/dev/20251201-cloudflare-rate-limiting-guide/ (nguồn bên thứ ba, cần đối chiếu lại trên trang Cloudflare khi cấu hình)
