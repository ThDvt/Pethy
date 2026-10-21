-- =====================================================================
-- HỆ THỐNG QUẢN LÝ PHÒNG KHÁM THÚ Y — 01_schema.sql
-- 23 bảng, ràng buộc, chỉ mục và dữ liệu cấu hình khởi tạo (PostgreSQL / Supabase)
--
-- Quy ước:
--   * Tên bảng, cột: tiếng Việt không dấu, chữ thường, nối bằng gạch dưới.
--   * Khóa chính uuid; thời gian timestamptz; tiền là integer (đồng VND).
--   * Giá trị cố định (vai trò, trạng thái) dùng text + CHECK.
--   * Dữ liệu quan trọng không xóa cứng: khóa ngoại ON DELETE RESTRICT,
--     dùng cột trạng thái để ẩn/khóa.
--
-- Thứ tự chạy: 01_schema -> 02_logic -> 03_rls -> 04_storage
-- Chạy trong Supabase: SQL Editor (vai trò postgres).
-- =====================================================================

-- ---------------------------------------------------------------------
-- NHÓM 1: TÀI KHOẢN VÀ NGƯỜI DÙNG
-- ---------------------------------------------------------------------

-- Tài khoản đăng nhập. Email và mật khẩu do Supabase Auth giữ trong auth.users.
CREATE TABLE tai_khoan (
  id            uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  ho_ten        text NOT NULL CHECK (length(btrim(ho_ten)) > 0),
  so_dien_thoai text CHECK (so_dien_thoai ~ '^(\+84|0)[0-9]{9}$'),
  vai_tro       text NOT NULL DEFAULT 'chu_nuoi'
                CHECK (vai_tro IN ('admin','bac_si','le_tan','thu_ngan','kho','chu_nuoi')),
  trang_thai    text NOT NULL DEFAULT 'hoat_dong'
                CHECK (trang_thai IN ('hoat_dong','khoa')),
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Hồ sơ khách hàng của phòng khám. tai_khoan_id để trống nếu khách chưa có tài khoản.
CREATE TABLE chu_nuoi (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tai_khoan_id  uuid UNIQUE REFERENCES tai_khoan(id) ON DELETE SET NULL,
  ho_ten        text NOT NULL CHECK (length(btrim(ho_ten)) > 0),
  so_dien_thoai text NOT NULL CHECK (so_dien_thoai ~ '^(\+84|0)[0-9]{9}$'),
  dia_chi       text,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_chu_nuoi_sdt ON chu_nuoi (so_dien_thoai);

CREATE TABLE ho_so_bac_si (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tai_khoan_id  uuid NOT NULL UNIQUE REFERENCES tai_khoan(id) ON DELETE CASCADE,
  chuyen_mon    text,
  gioi_thieu    text,
  anh_dai_dien  text,   -- đường dẫn ảnh trong Storage, không lưu ảnh trong bảng
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE lich_lam_viec (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bac_si_id      uuid NOT NULL REFERENCES tai_khoan(id) ON DELETE CASCADE,
  thu_trong_tuan smallint NOT NULL CHECK (thu_trong_tuan BETWEEN 1 AND 7), -- 1 = thứ Hai
  gio_bat_dau    time NOT NULL,
  gio_ket_thuc   time NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  CHECK (gio_ket_thuc > gio_bat_dau),
  UNIQUE (bac_si_id, thu_trong_tuan, gio_bat_dau)
);

-- Tham số hệ thống. cong_khai = true thì khách chưa đăng nhập cũng đọc được.
CREATE TABLE cau_hinh (
  khoa       text PRIMARY KEY,
  gia_tri    text NOT NULL,
  mo_ta      text,
  cong_khai  boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- NHÓM 2: THÚ CƯNG VÀ DỊCH VỤ
-- ---------------------------------------------------------------------

CREATE TABLE thu_cung (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chu_nuoi_id uuid NOT NULL REFERENCES chu_nuoi(id) ON DELETE RESTRICT,
  ten         text NOT NULL CHECK (length(btrim(ten)) > 0),
  loai        text NOT NULL CHECK (length(btrim(loai)) > 0),
  ngay_sinh   date,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_thu_cung_chu_nuoi ON thu_cung (chu_nuoi_id);

CREATE TABLE dich_vu (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ten           text NOT NULL UNIQUE CHECK (length(btrim(ten)) > 0),
  loai          text NOT NULL CHECK (loai IN ('kham','tiem','xet_nghiem','phau_thuat','spa','luu_chuong','khac')),
  gia           integer NOT NULL CHECK (gia >= 0),
  dang_ap_dung  boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- NHÓM 3: THUỐC VÀ KHO (thuốc và vaccine cùng một bảng, phân biệt bằng loai)
-- ---------------------------------------------------------------------

CREATE TABLE thuoc (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ten             text NOT NULL CHECK (length(btrim(ten)) > 0),
  loai            text NOT NULL CHECK (loai IN ('thuoc','vaccine')),
  don_vi          text NOT NULL CHECK (length(btrim(don_vi)) > 0),
  gia_ban         integer NOT NULL CHECK (gia_ban >= 0),
  nguong_canh_bao integer NOT NULL DEFAULT 10 CHECK (nguong_canh_bao >= 0), -- cảnh báo khi tồn <= ngưỡng
  dang_ap_dung    boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ten, don_vi)
);

CREATE TABLE lo_thuoc (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thuoc_id   uuid NOT NULL REFERENCES thuoc(id) ON DELETE RESTRICT,
  so_lo      text NOT NULL CHECK (length(btrim(so_lo)) > 0),
  han_dung   date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (thuoc_id, so_lo)
);
CREATE INDEX idx_lo_thuoc_han_dung ON lo_thuoc (han_dung);

-- ---------------------------------------------------------------------
-- NHÓM 4: LỊCH HẸN, KHÁM, ĐƠN THUỐC, TIÊM
-- ---------------------------------------------------------------------

CREATE TABLE lich_hen (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thu_cung_id       uuid NOT NULL REFERENCES thu_cung(id) ON DELETE RESTRICT,
  bac_si_id         uuid NOT NULL REFERENCES tai_khoan(id) ON DELETE RESTRICT,
  dich_vu_id        uuid NOT NULL REFERENCES dich_vu(id) ON DELETE RESTRICT,
  vaccine_id        uuid REFERENCES thuoc(id) ON DELETE RESTRICT,   -- chỉ có khi dịch vụ là tiêm
  nguoi_xac_nhan_id uuid REFERENCES tai_khoan(id) ON DELETE RESTRICT,
  thoi_gian         timestamptz NOT NULL,                           -- giờ bắt đầu khung
  trang_thai        text NOT NULL DEFAULT 'cho_xac_nhan'
                    CHECK (trang_thai IN ('cho_xac_nhan','da_xac_nhan','da_hoan_thanh','da_huy','khong_den')),
  ghi_chu           text,
  ly_do_huy         text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  CHECK (trang_thai <> 'da_huy' OR ly_do_huy IS NOT NULL)
);
-- Chống trùng lịch: một bác sĩ chỉ có một lịch (chưa hủy) tại một giờ.
-- Lịch đã hủy không chiếm khung giờ nên có thể đặt lại.
CREATE UNIQUE INDEX uq_lich_hen_bacsi_gio
  ON lich_hen (bac_si_id, thoi_gian) WHERE trang_thai <> 'da_huy';
CREATE INDEX idx_lich_hen_thu_cung     ON lich_hen (thu_cung_id);
CREATE INDEX idx_lich_hen_trang_thai   ON lich_hen (trang_thai, thoi_gian);

CREATE TABLE ho_so_kham (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lich_hen_id uuid NOT NULL UNIQUE REFERENCES lich_hen(id) ON DELETE RESTRICT,
  chan_doan   text NOT NULL CHECK (length(btrim(chan_doan)) > 0),
  can_nang    numeric(5,2) CHECK (can_nang > 0),         -- kg
  nhiet_do    numeric(4,1) CHECK (nhiet_do BETWEEN 30 AND 45), -- độ C
  ghi_chu     text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE don_thuoc (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ho_so_kham_id uuid NOT NULL UNIQUE REFERENCES ho_so_kham(id) ON DELETE RESTRICT,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE ct_don_thuoc (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  don_thuoc_id uuid NOT NULL REFERENCES don_thuoc(id) ON DELETE RESTRICT,
  thuoc_id     uuid NOT NULL REFERENCES thuoc(id) ON DELETE RESTRICT,
  so_luong     integer NOT NULL CHECK (so_luong > 0),
  lieu_dung    text NOT NULL CHECK (length(btrim(lieu_dung)) > 0),
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (don_thuoc_id, thuoc_id)
);
CREATE INDEX idx_ct_don_thuoc_thuoc ON ct_don_thuoc (thuoc_id);

CREATE TABLE mui_tiem (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thu_cung_id    uuid NOT NULL REFERENCES thu_cung(id) ON DELETE RESTRICT,
  thuoc_id       uuid NOT NULL REFERENCES thuoc(id) ON DELETE RESTRICT, -- phải là vaccine (kiểm tra trong hàm ghi_tiem)
  bac_si_id      uuid NOT NULL REFERENCES tai_khoan(id) ON DELETE RESTRICT,
  lich_hen_id    uuid REFERENCES lich_hen(id) ON DELETE RESTRICT,
  ngay_tiem      date NOT NULL,
  ngay_tiem_tiep date,
  created_at     timestamptz NOT NULL DEFAULT now(),
  CHECK (ngay_tiem_tiep IS NULL OR ngay_tiem_tiep > ngay_tiem)
);
CREATE INDEX idx_mui_tiem_thu_cung ON mui_tiem (thu_cung_id, ngay_tiem);
CREATE INDEX idx_mui_tiem_tiep     ON mui_tiem (ngay_tiem_tiep);
CREATE INDEX idx_mui_tiem_lich     ON mui_tiem (lich_hen_id);

-- Sổ cái kho: nhập, xuất, điều chỉnh. Tồn kho của một lô = tổng so_luong.
-- Chỉ thêm, không sửa, không xóa (bảo vệ bằng trigger ở 02_logic.sql).
CREATE TABLE bien_dong_kho (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lo_thuoc_id         uuid NOT NULL REFERENCES lo_thuoc(id) ON DELETE RESTRICT,
  nguoi_thuc_hien_id  uuid NOT NULL REFERENCES tai_khoan(id) ON DELETE RESTRICT,
  loai                text NOT NULL CHECK (loai IN ('nhap','xuat_ke_don','xuat_tiem','dieu_chinh')),
  so_luong            integer NOT NULL CHECK (so_luong <> 0),   -- dương: tăng kho, âm: giảm kho
  ly_do               text,
  ct_don_thuoc_id     uuid REFERENCES ct_don_thuoc(id) ON DELETE SET NULL, -- truy vết dòng đơn
  mui_tiem_id         uuid REFERENCES mui_tiem(id) ON DELETE RESTRICT,     -- truy vết mũi tiêm
  thoi_gian           timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (loai = 'nhap' AND so_luong > 0) OR
    (loai IN ('xuat_ke_don','xuat_tiem') AND so_luong < 0) OR
    (loai = 'dieu_chinh')
  ),
  CHECK (loai <> 'dieu_chinh' OR (ly_do IS NOT NULL AND length(btrim(ly_do)) > 0))
);
CREATE INDEX idx_bdk_lo_thoi_gian ON bien_dong_kho (lo_thuoc_id, thoi_gian);
CREATE INDEX idx_bdk_ct_don       ON bien_dong_kho (ct_don_thuoc_id);
CREATE INDEX idx_bdk_mui_tiem     ON bien_dong_kho (mui_tiem_id);

-- ---------------------------------------------------------------------
-- NHÓM 5: HÓA ĐƠN VÀ THANH TOÁN
-- ---------------------------------------------------------------------

CREATE TABLE hoa_don (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lich_hen_id uuid NOT NULL REFERENCES lich_hen(id) ON DELETE RESTRICT,
  thu_ngan_id uuid NOT NULL REFERENCES tai_khoan(id) ON DELETE RESTRICT,
  tong_tien   integer NOT NULL CHECK (tong_tien >= 0),
  trang_thai  text NOT NULL DEFAULT 'chua_thanh_toan'
              CHECK (trang_thai IN ('chua_thanh_toan','thanh_toan_mot_phan','da_thanh_toan','da_huy')),
  created_at  timestamptz NOT NULL DEFAULT now()
);
-- Mỗi lịch tối đa một hóa đơn còn hiệu lực (hóa đơn đã hủy cho phép lập lại).
CREATE UNIQUE INDEX uq_hoa_don_lich ON hoa_don (lich_hen_id) WHERE trang_thai <> 'da_huy';

CREATE TABLE ct_hoa_don (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hoa_don_id  uuid NOT NULL REFERENCES hoa_don(id) ON DELETE RESTRICT,
  mo_ta       text NOT NULL,
  so_luong    integer NOT NULL CHECK (so_luong > 0),
  don_gia     integer NOT NULL CHECK (don_gia >= 0),   -- chép giá lúc lập hóa đơn
  thanh_tien  integer GENERATED ALWAYS AS (so_luong * don_gia) STORED,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ct_hoa_don_hd ON ct_hoa_don (hoa_don_id);

-- Chỉ thêm, không sửa, không xóa (trigger ở 02_logic.sql).
CREATE TABLE thanh_toan (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hoa_don_id  uuid NOT NULL REFERENCES hoa_don(id) ON DELETE RESTRICT,
  thu_ngan_id uuid NOT NULL REFERENCES tai_khoan(id) ON DELETE RESTRICT,
  so_tien     integer NOT NULL CHECK (so_tien > 0),
  phuong_thuc text NOT NULL CHECK (phuong_thuc IN ('tien_mat','chuyen_khoan')),
  thoi_gian   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_thanh_toan_hd        ON thanh_toan (hoa_don_id);
CREATE INDEX idx_thanh_toan_thoi_gian ON thanh_toan (thoi_gian);

-- ---------------------------------------------------------------------
-- NHÓM 6: NHẬT KÝ VÀ NHẮC LỊCH
-- ---------------------------------------------------------------------

-- Nhật ký thao tác: chỉ thêm, không sửa, không xóa, kể cả với admin.
CREATE TABLE nhat_ky (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tai_khoan_id  uuid REFERENCES tai_khoan(id) ON DELETE RESTRICT, -- trống nếu thao tác từ SQL Editor
  hanh_dong     text NOT NULL,                                    -- them, sua, xoa, xem (xem hồ sơ khám)
  bang_tac_dong text,
  ban_ghi_id    uuid,
  gia_tri_cu    jsonb,
  gia_tri_moi   jsonb,
  thoi_gian     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_nhat_ky_thoi_gian ON nhat_ky (thoi_gian DESC);
CREATE INDEX idx_nhat_ky_ban_ghi   ON nhat_ky (bang_tac_dong, ban_ghi_id);
CREATE INDEX idx_nhat_ky_tai_khoan ON nhat_ky (tai_khoan_id);

CREATE TABLE nhac_lich (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lich_hen_id        uuid REFERENCES lich_hen(id) ON DELETE RESTRICT,
  mui_tiem_id        uuid REFERENCES mui_tiem(id) ON DELETE RESTRICT,
  nguoi_thuc_hien_id uuid REFERENCES tai_khoan(id) ON DELETE RESTRICT,
  kenh               text NOT NULL CHECK (kenh IN ('email','dien_thoai','khac')),
  trang_thai         text NOT NULL DEFAULT 'cho_gui' CHECK (trang_thai IN ('cho_gui','da_gui','that_bai')),
  thoi_gian          timestamptz NOT NULL DEFAULT now(),
  created_at         timestamptz NOT NULL DEFAULT now(),
  -- mỗi dòng nhắc thuộc đúng một trong hai loại
  CHECK ((lich_hen_id IS NOT NULL)::int + (mui_tiem_id IS NOT NULL)::int = 1)
);
CREATE INDEX idx_nhac_lich_lich ON nhac_lich (lich_hen_id);
CREATE INDEX idx_nhac_lich_tiem ON nhac_lich (mui_tiem_id);

-- ---------------------------------------------------------------------
-- NHÓM 5B: GIỚI HẠN TẦN SUẤT GỌI HÀM (chống lạm dụng)
-- Mỗi lần chủ nuôi gọi một hàm có giới hạn thì thêm một dòng; hàm _gioi_han đếm số dòng
-- gần đây. Chỉ các hàm nghiệp vụ (SECURITY DEFINER) đọc và ghi bảng này; trình duyệt không chạm tới.
-- Lưu ý: lần gọi bị lỗi sẽ hoàn tác cả dòng đếm của nó, nên giới hạn tính theo lần gọi thành công.
-- ---------------------------------------------------------------------
CREATE TABLE gioi_han_goi (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nguoi_dung_id uuid NOT NULL REFERENCES tai_khoan(id) ON DELETE CASCADE,
  hanh_dong     text NOT NULL,
  thoi_gian     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_gioi_han_goi ON gioi_han_goi (nguoi_dung_id, hanh_dong, thoi_gian DESC);

-- ---------------------------------------------------------------------
-- NHÓM 6: TRAO ĐỔI NỘI BỘ (nhân viên <-> admin, chỉ văn bản)
-- Mỗi nhân viên (không phải admin, không phải chủ nuôi) có một luồng trò chuyện
-- riêng với admin; luồng được xác định bởi nhan_vien_id. Chỉ thêm, không sửa/xóa.
-- ---------------------------------------------------------------------

CREATE TABLE tin_nhan (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nhan_vien_id  uuid NOT NULL REFERENCES tai_khoan(id) ON DELETE RESTRICT,  -- chủ của luồng
  nguoi_gui_id  uuid NOT NULL REFERENCES tai_khoan(id) ON DELETE RESTRICT,
  noi_dung      text NOT NULL CHECK (length(btrim(noi_dung)) BETWEEN 1 AND 1000),
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_tin_nhan_luong ON tin_nhan (nhan_vien_id, created_at);
CREATE INDEX idx_tin_nhan_nguoi_gui ON tin_nhan (nguoi_gui_id, created_at);

-- Mốc đã đọc của từng người trong từng luồng (để đếm tin chưa đọc).
CREATE TABLE doc_tin_nhan (
  nhan_vien_id uuid NOT NULL REFERENCES tai_khoan(id) ON DELETE CASCADE,
  tai_khoan_id uuid NOT NULL REFERENCES tai_khoan(id) ON DELETE CASCADE,
  doc_den      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (nhan_vien_id, tai_khoan_id)
);

-- ---------------------------------------------------------------------
-- DỮ LIỆU CẤU HÌNH KHỞI TẠO (bắt buộc để hệ thống chạy)
-- ---------------------------------------------------------------------
INSERT INTO cau_hinh (khoa, gia_tri, mo_ta, cong_khai) VALUES
  ('che_do_bao_tri',         'false', 'Bật (true) để đóng web phục vụ cập nhật; chỉ admin vẫn truy cập được', true),
  ('thong_bao_bao_tri',      'Hệ thống đang bảo trì, vui lòng quay lại sau.', 'Nội dung hiển thị trên trang bảo trì', true),
  ('do_dai_khung_gio_phut',  '30',    'Độ dài mỗi khung giờ khám (phút)', true),
  ('dat_truoc_toi_da_ngay',  '30',    'Chủ nuôi chỉ được đặt trước tối đa số ngày này', true),
  ('dat_truoc_toi_thieu_gio','2',     'Chủ nuôi phải đặt cách hiện tại tối thiểu số giờ này', true),
  ('huy_doi_truoc_gio',      '2',     'Chủ nuôi chỉ được đổi hoặc hủy lịch trước giờ hẹn tối thiểu số giờ này', true),
  ('gioi_han_lich_cho',      '5',     'Số lịch chưa diễn ra tối đa của mỗi chủ nuôi', true),
  ('canh_bao_han_dung_ngay', '30',    'Cảnh báo lô thuốc còn hạn dùng ít hơn số ngày này', false);
