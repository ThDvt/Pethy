-- =====================================================================
-- HỆ THỐNG QUẢN LÝ PHÒNG KHÁM THÚ Y — 03_rls.sql
-- Phân quyền ở phía cơ sở dữ liệu: Row Level Security + quyền theo bảng/cột.
--
-- Nguyên tắc:
--   1. Mặc định cấm. Thu hồi toàn bộ quyền của anon/authenticated rồi cấp lại từng phần.
--   2. Bảng giao dịch (lịch hẹn, hồ sơ khám, đơn thuốc, kho, hóa đơn, thanh toán,
--      nhật ký, nhắc lịch) chỉ ĐỌC trực tiếp; mọi thao tác ghi đi qua hàm trong 02_logic.sql.
--   3. Chủ nuôi chỉ thấy dữ liệu của chính mình.
--   4. Chế độ bảo trì được thực thi ở đây: khi bật, vai_tro_hieu_luc() trả về NULL
--      với mọi vai trò trừ admin nên chính sách nào dựa vào vai trò đều từ chối.
--
-- Phải chạy sau 02_logic.sql.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. BẬT RLS CHO 20 BẢNG
-- ---------------------------------------------------------------------
ALTER TABLE tai_khoan      ENABLE ROW LEVEL SECURITY;
ALTER TABLE chu_nuoi       ENABLE ROW LEVEL SECURITY;
ALTER TABLE ho_so_bac_si   ENABLE ROW LEVEL SECURITY;
ALTER TABLE lich_lam_viec  ENABLE ROW LEVEL SECURITY;
ALTER TABLE cau_hinh       ENABLE ROW LEVEL SECURITY;
ALTER TABLE thu_cung       ENABLE ROW LEVEL SECURITY;
ALTER TABLE dich_vu        ENABLE ROW LEVEL SECURITY;
ALTER TABLE thuoc          ENABLE ROW LEVEL SECURITY;
ALTER TABLE lo_thuoc       ENABLE ROW LEVEL SECURITY;
ALTER TABLE lich_hen       ENABLE ROW LEVEL SECURITY;
ALTER TABLE ho_so_kham     ENABLE ROW LEVEL SECURITY;
ALTER TABLE don_thuoc      ENABLE ROW LEVEL SECURITY;
ALTER TABLE ct_don_thuoc   ENABLE ROW LEVEL SECURITY;
ALTER TABLE mui_tiem       ENABLE ROW LEVEL SECURITY;
ALTER TABLE bien_dong_kho  ENABLE ROW LEVEL SECURITY;
ALTER TABLE hoa_don        ENABLE ROW LEVEL SECURITY;
ALTER TABLE ct_hoa_don     ENABLE ROW LEVEL SECURITY;
ALTER TABLE thanh_toan     ENABLE ROW LEVEL SECURITY;
ALTER TABLE nhat_ky        ENABLE ROW LEVEL SECURITY;
ALTER TABLE nhac_lich      ENABLE ROW LEVEL SECURITY;
ALTER TABLE danh_gia       ENABLE ROW LEVEL SECURITY;
ALTER TABLE tin_nhan       ENABLE ROW LEVEL SECURITY;
ALTER TABLE doc_tin_nhan   ENABLE ROW LEVEL SECURITY;
ALTER TABLE gioi_han_goi   ENABLE ROW LEVEL SECURITY;   -- không có chính sách nào: trình duyệt không chạm tới

-- ---------------------------------------------------------------------
-- 2. QUYỀN THEO BẢNG VÀ CỘT (lớp thứ nhất; RLS là lớp thứ hai)
-- ---------------------------------------------------------------------
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;

-- Khách chưa đăng nhập: chỉ đọc cấu hình công khai, dịch vụ và danh sách bác sĩ.
GRANT SELECT ON cau_hinh, dich_vu, bac_si_cong_khai, danh_gia_cong_khai TO anon;

-- Người đã đăng nhập: được đọc (RLS quyết định hàng nào thấy được).
GRANT SELECT ON
  tai_khoan, chu_nuoi, ho_so_bac_si, lich_lam_viec, cau_hinh, thu_cung, dich_vu,
  thuoc, lo_thuoc, bien_dong_kho, lich_hen, ho_so_kham, don_thuoc, ct_don_thuoc,
  mui_tiem, hoa_don, ct_hoa_don, thanh_toan, nhat_ky, nhac_lich,
  tin_nhan, doc_tin_nhan,
  bac_si_cong_khai, danh_gia, danh_gia_cong_khai, ton_kho_lo, ton_kho_thuoc, canh_bao_kho, lich_can_nhac,
  cong_no_hoa_don, hop_thu_noi_bo
  TO authenticated;

-- Ghi trực tiếp: chỉ các bảng danh mục/hồ sơ đơn giản, giới hạn theo cột.
-- vai_tro và trang_thai của tai_khoan KHÔNG cập nhật được trực tiếp (chỉ qua dat_vai_tro/khoa_tai_khoan).
GRANT UPDATE (ho_ten, so_dien_thoai) ON tai_khoan TO authenticated;
GRANT INSERT (ho_ten, so_dien_thoai, dia_chi), UPDATE (ho_ten, so_dien_thoai, dia_chi)
  ON chu_nuoi TO authenticated;    -- tai_khoan_id không ghi được trực tiếp
GRANT INSERT (chu_nuoi_id, ten, loai, ngay_sinh), UPDATE (ten, loai, ngay_sinh)
  ON thu_cung TO authenticated;
GRANT INSERT (tai_khoan_id, chuyen_mon, gioi_thieu, anh_dai_dien),
      UPDATE (chuyen_mon, gioi_thieu, anh_dai_dien)
  ON ho_so_bac_si TO authenticated;
GRANT INSERT, UPDATE, DELETE ON lich_lam_viec TO authenticated;
GRANT INSERT (khoa, gia_tri, mo_ta, cong_khai), UPDATE (gia_tri, mo_ta, cong_khai)
  ON cau_hinh TO authenticated;
GRANT INSERT (ten, loai, gia, mo_ta, dang_ap_dung), UPDATE (ten, gia, mo_ta, dang_ap_dung)
  ON dich_vu TO authenticated;
GRANT INSERT (ten, loai, don_vi, gia_ban, nguong_canh_bao, dang_ap_dung),
      UPDATE (ten, don_vi, gia_ban, nguong_canh_bao, dang_ap_dung)
  ON thuoc TO authenticated;

-- ---------------------------------------------------------------------
-- 3. CHÍNH SÁCH THEO BẢNG
-- ---------------------------------------------------------------------

-- tai_khoan: xem của mình; admin và lễ tân xem tất cả. Sửa tên/số điện thoại của mình.
CREATE POLICY tai_khoan_doc ON tai_khoan FOR SELECT TO authenticated
  USING (id = auth.uid() OR vai_tro_hieu_luc() IN ('admin','le_tan'));
CREATE POLICY tai_khoan_sua_minh ON tai_khoan FOR UPDATE TO authenticated
  USING (id = auth.uid() AND vai_tro_hieu_luc() IS NOT NULL)
  WITH CHECK (id = auth.uid());
CREATE POLICY tai_khoan_sua_admin ON tai_khoan FOR UPDATE TO authenticated
  USING (vai_tro_hieu_luc() = 'admin') WITH CHECK (vai_tro_hieu_luc() = 'admin');

-- chu_nuoi: chủ nuôi thấy hồ sơ của mình; nhân viên liên quan thấy tất cả.
-- Lễ tân/admin tạo hồ sơ cho khách đến trực tiếp (chưa có tài khoản).
CREATE POLICY chu_nuoi_doc ON chu_nuoi FOR SELECT TO authenticated
  USING ((vai_tro_hieu_luc() = 'chu_nuoi' AND la_chu_nuoi_cua(id))
         OR vai_tro_hieu_luc() IN ('admin','le_tan','bac_si','thu_ngan'));
CREATE POLICY chu_nuoi_them ON chu_nuoi FOR INSERT TO authenticated
  WITH CHECK (vai_tro_hieu_luc() IN ('admin','le_tan') AND tai_khoan_id IS NULL);
CREATE POLICY chu_nuoi_sua ON chu_nuoi FOR UPDATE TO authenticated
  USING ((vai_tro_hieu_luc() = 'chu_nuoi' AND la_chu_nuoi_cua(id))
         OR vai_tro_hieu_luc() IN ('admin','le_tan'))
  WITH CHECK ((vai_tro_hieu_luc() = 'chu_nuoi' AND la_chu_nuoi_cua(id))
              OR vai_tro_hieu_luc() IN ('admin','le_tan'));

-- ho_so_bac_si: admin toàn quyền; bác sĩ xem và sửa hồ sơ của chính mình (BS06).
CREATE POLICY ho_so_bac_si_doc ON ho_so_bac_si FOR SELECT TO authenticated
  USING (vai_tro_hieu_luc() = 'admin'
         OR (vai_tro_hieu_luc() = 'bac_si' AND tai_khoan_id = auth.uid()));
CREATE POLICY ho_so_bac_si_them ON ho_so_bac_si FOR INSERT TO authenticated
  WITH CHECK (vai_tro_hieu_luc() = 'admin');
CREATE POLICY ho_so_bac_si_sua ON ho_so_bac_si FOR UPDATE TO authenticated
  USING (vai_tro_hieu_luc() = 'admin'
         OR (vai_tro_hieu_luc() = 'bac_si' AND tai_khoan_id = auth.uid()))
  WITH CHECK (vai_tro_hieu_luc() = 'admin'
              OR (vai_tro_hieu_luc() = 'bac_si' AND tai_khoan_id = auth.uid()));

-- lich_lam_viec: admin quản lý; lễ tân và chính bác sĩ xem.
CREATE POLICY lich_lam_viec_doc ON lich_lam_viec FOR SELECT TO authenticated
  USING (vai_tro_hieu_luc() IN ('admin','le_tan')
         OR (vai_tro_hieu_luc() = 'bac_si' AND bac_si_id = auth.uid()));
CREATE POLICY lich_lam_viec_admin ON lich_lam_viec FOR ALL TO authenticated
  USING (vai_tro_hieu_luc() = 'admin') WITH CHECK (vai_tro_hieu_luc() = 'admin');

-- cau_hinh: khóa công khai ai cũng đọc được (kể cả khi đang bảo trì); admin đọc và sửa tất cả.
CREATE POLICY cau_hinh_cong_khai ON cau_hinh FOR SELECT TO anon, authenticated
  USING (cong_khai);
CREATE POLICY cau_hinh_doc_admin ON cau_hinh FOR SELECT TO authenticated
  USING (vai_tro_hieu_luc() = 'admin');
CREATE POLICY cau_hinh_them ON cau_hinh FOR INSERT TO authenticated
  WITH CHECK (vai_tro_hieu_luc() = 'admin');
CREATE POLICY cau_hinh_sua ON cau_hinh FOR UPDATE TO authenticated
  USING (vai_tro_hieu_luc() = 'admin') WITH CHECK (vai_tro_hieu_luc() = 'admin');

-- thu_cung: chủ nuôi quản lý thú cưng của mình; lễ tân/admin quản lý hộ.
CREATE POLICY thu_cung_doc ON thu_cung FOR SELECT TO authenticated
  USING ((vai_tro_hieu_luc() = 'chu_nuoi' AND la_chu_nuoi_cua(chu_nuoi_id))
         OR vai_tro_hieu_luc() IN ('admin','le_tan','bac_si','thu_ngan'));
CREATE POLICY thu_cung_them ON thu_cung FOR INSERT TO authenticated
  WITH CHECK ((vai_tro_hieu_luc() = 'chu_nuoi' AND la_chu_nuoi_cua(chu_nuoi_id))
              OR vai_tro_hieu_luc() IN ('admin','le_tan'));
CREATE POLICY thu_cung_sua ON thu_cung FOR UPDATE TO authenticated
  USING ((vai_tro_hieu_luc() = 'chu_nuoi' AND la_chu_nuoi_cua(chu_nuoi_id))
         OR vai_tro_hieu_luc() IN ('admin','le_tan'))
  WITH CHECK ((vai_tro_hieu_luc() = 'chu_nuoi' AND la_chu_nuoi_cua(chu_nuoi_id))
              OR vai_tro_hieu_luc() IN ('admin','le_tan'));

-- dich_vu: khách xem dịch vụ đang áp dụng; người đăng nhập xem cả dịch vụ đã ngừng
-- (để hiển thị lịch sử); admin quản lý.
CREATE POLICY dich_vu_khach ON dich_vu FOR SELECT TO anon
  USING (dang_ap_dung);
CREATE POLICY dich_vu_dang_nhap ON dich_vu FOR SELECT TO authenticated
  USING (dang_ap_dung OR vai_tro_hieu_luc() IS NOT NULL);
CREATE POLICY dich_vu_them ON dich_vu FOR INSERT TO authenticated
  WITH CHECK (vai_tro_hieu_luc() = 'admin');
CREATE POLICY dich_vu_sua ON dich_vu FOR UPDATE TO authenticated
  USING (vai_tro_hieu_luc() = 'admin') WITH CHECK (vai_tro_hieu_luc() = 'admin');

-- thuoc (gồm vaccine): người đăng nhập xem danh mục (tên, giá, không có tồn kho);
-- thủ kho và admin quản lý.
CREATE POLICY thuoc_doc ON thuoc FOR SELECT TO authenticated
  USING (vai_tro_hieu_luc() IS NOT NULL);
CREATE POLICY thuoc_them ON thuoc FOR INSERT TO authenticated
  WITH CHECK (vai_tro_hieu_luc() IN ('admin','kho'));
CREATE POLICY thuoc_sua ON thuoc FOR UPDATE TO authenticated
  USING (vai_tro_hieu_luc() IN ('admin','kho')) WITH CHECK (vai_tro_hieu_luc() IN ('admin','kho'));

-- lo_thuoc, bien_dong_kho: chỉ thủ kho và admin đọc; ghi qua nhap_kho/dieu_chinh_kho.
CREATE POLICY lo_thuoc_doc ON lo_thuoc FOR SELECT TO authenticated
  USING (vai_tro_hieu_luc() IN ('admin','kho'));
CREATE POLICY bien_dong_kho_doc ON bien_dong_kho FOR SELECT TO authenticated
  USING (vai_tro_hieu_luc() IN ('admin','kho'));

-- lich_hen: chủ nuôi thấy lịch của thú cưng mình; bác sĩ (cần xem lịch sử khám liên tục),
-- lễ tân, thu ngân, admin thấy tất cả. Ghi qua dat_lich/doi_lich/huy_lich/xac_nhan_lich.
CREATE POLICY lich_hen_doc ON lich_hen FOR SELECT TO authenticated
  USING ((vai_tro_hieu_luc() = 'chu_nuoi' AND la_chu_lich_hen(id))
         OR vai_tro_hieu_luc() IN ('admin','le_tan','bac_si','thu_ngan'));

-- Hồ sơ khám và đơn thuốc: chủ nuôi đọc trực tiếp phần của mình. Bác sĩ và admin KHÔNG đọc trực tiếp,
-- phải gọi xem_ho_so_kham() để mỗi lần mở hồ sơ được ghi vào nhật ký. Lễ tân, thu ngân, thủ kho
-- không đọc nội dung chuyên môn.
CREATE POLICY ho_so_kham_doc ON ho_so_kham FOR SELECT TO authenticated
  USING (vai_tro_hieu_luc() = 'chu_nuoi' AND la_chu_lich_hen(lich_hen_id));
CREATE POLICY don_thuoc_doc ON don_thuoc FOR SELECT TO authenticated
  USING (vai_tro_hieu_luc() = 'chu_nuoi' AND la_chu_ho_so_kham(ho_so_kham_id));
CREATE POLICY ct_don_thuoc_doc ON ct_don_thuoc FOR SELECT TO authenticated
  USING (vai_tro_hieu_luc() = 'chu_nuoi' AND la_chu_don_thuoc(don_thuoc_id));

-- mui_tiem: chủ nuôi (của mình), bác sĩ, lễ tân (để nhắc lịch), admin.
CREATE POLICY mui_tiem_doc ON mui_tiem FOR SELECT TO authenticated
  USING ((vai_tro_hieu_luc() = 'chu_nuoi' AND la_chu_thu_cung(thu_cung_id))
         OR vai_tro_hieu_luc() IN ('admin','bac_si','le_tan'));

-- Hóa đơn và thanh toán: chủ nuôi (của mình), thu ngân, admin.
CREATE POLICY hoa_don_doc ON hoa_don FOR SELECT TO authenticated
  USING ((vai_tro_hieu_luc() = 'chu_nuoi' AND la_chu_lich_hen(lich_hen_id))
         OR vai_tro_hieu_luc() IN ('admin','thu_ngan'));
CREATE POLICY ct_hoa_don_doc ON ct_hoa_don FOR SELECT TO authenticated
  USING ((vai_tro_hieu_luc() = 'chu_nuoi' AND la_chu_hoa_don(hoa_don_id))
         OR vai_tro_hieu_luc() IN ('admin','thu_ngan'));
CREATE POLICY thanh_toan_doc ON thanh_toan FOR SELECT TO authenticated
  USING ((vai_tro_hieu_luc() = 'chu_nuoi' AND la_chu_hoa_don(hoa_don_id))
         OR vai_tro_hieu_luc() IN ('admin','thu_ngan'));

-- nhat_ky: chỉ admin đọc. Không ai ghi trực tiếp (trigger tự ghi).
CREATE POLICY nhat_ky_doc ON nhat_ky FOR SELECT TO authenticated
  USING (vai_tro_hieu_luc() = 'admin');

-- nhac_lich: lễ tân và admin đọc; ghi qua ghi_nhan_nhac.
CREATE POLICY nhac_lich_doc ON nhac_lich FOR SELECT TO authenticated
  USING (vai_tro_hieu_luc() IN ('admin','le_tan'));

-- tin_nhan: admin đọc mọi luồng; nhân viên chỉ đọc luồng của mình. Ghi qua gui_tin_nhan.
CREATE POLICY tin_nhan_doc ON tin_nhan FOR SELECT TO authenticated
  USING (vai_tro_hieu_luc() = 'admin'
         OR (vai_tro_hieu_luc() IN ('bac_si','le_tan','thu_ngan','kho') AND nhan_vien_id = auth.uid()));

-- doc_tin_nhan: mỗi người chỉ đọc mốc đã đọc của chính mình. Ghi qua danh_dau_da_doc.
CREATE POLICY doc_tin_nhan_doc ON doc_tin_nhan FOR SELECT TO authenticated
  USING (tai_khoan_id = auth.uid() AND vai_tro_hieu_luc() IS NOT NULL);

-- danh_gia: chủ nuôi xem đánh giá của chính mình, admin xem tất cả. Ghi chỉ qua gui_danh_gia / an_hien_danh_gia.
CREATE POLICY danh_gia_doc ON danh_gia FOR SELECT TO authenticated
  USING ((vai_tro_hieu_luc() = 'chu_nuoi' AND la_chu_lich_hen(lich_hen_id))
         OR vai_tro_hieu_luc() = 'admin');
