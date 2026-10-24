-- =====================================================================
-- HỆ THỐNG QUẢN LÝ PHÒNG KHÁM THÚ Y — 02_logic.sql
-- Hàm hỗ trợ, hàm nghiệp vụ (gọi qua supabase.rpc), view, trigger.
--
-- Nguyên tắc: các bảng giao dịch (lịch hẹn, hồ sơ khám, đơn thuốc, kho, hóa đơn,
-- thanh toán) KHÔNG cho ghi trực tiếp từ trình duyệt. Mọi thao tác ghi đi qua
-- các hàm dưới đây; mỗi hàm chạy trong một giao dịch, lỗi giữa chừng thì hủy hết.
--
-- Lỗi nghiệp vụ có dạng  'MA_LOI: mô tả'  (ERRCODE P0001, HINT = MA_LOI).
-- Phải chạy sau 01_schema.sql.
-- =====================================================================

-- ---------------------------------------------------------------------
-- A. HÀM HỖ TRỢ
-- ---------------------------------------------------------------------

CREATE FUNCTION hom_nay() RETURNS date
LANGUAGE sql STABLE AS $$
  SELECT (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
$$;

-- Đọc tham số số nguyên trong cau_hinh; sai định dạng hoặc thiếu thì dùng mặc định.
CREATE FUNCTION cau_hinh_so(p_khoa text, p_mac_dinh integer) RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT coalesce(
    (SELECT CASE WHEN c.gia_tri ~ '^[0-9]+$' THEN c.gia_tri::integer END
       FROM cau_hinh c WHERE c.khoa = p_khoa),
    p_mac_dinh)
$$;

CREATE FUNCTION dang_bao_tri() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT coalesce((SELECT lower(btrim(c.gia_tri)) = 'true'
                     FROM cau_hinh c WHERE c.khoa = 'che_do_bao_tri'), false)
$$;

-- Vai trò của người đang đăng nhập; trống nếu chưa đăng nhập hoặc tài khoản bị khóa.
-- Admin đã đăng ký xác thực hai lớp (TOTP) mà phiên mới ở mức aal1 (chưa nhập mã) thì chưa có
-- vai trò: biết mật khẩu thôi không đủ, kể cả khi gọi thẳng API mà bỏ qua giao diện.
CREATE FUNCTION vai_tro_hien_tai() RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT t.vai_tro FROM tai_khoan t
   WHERE t.id = auth.uid() AND t.trang_thai = 'hoat_dong'
     AND NOT (t.vai_tro = 'admin'
              AND coalesce(auth.jwt() ->> 'aal', 'aal1') <> 'aal2'
              AND EXISTS (SELECT 1 FROM auth.mfa_factors f
                           WHERE f.user_id = t.id AND f.status = 'verified'))
$$;

-- Vai trò có hiệu lực: như trên, nhưng khi đang bảo trì thì chỉ admin còn hiệu lực.
-- Đây là chỗ thực thi chế độ bảo trì ở phía server (RLS và các hàm đều dùng).
CREATE FUNCTION vai_tro_hieu_luc() RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT CASE
           WHEN s.vt IS NULL THEN NULL
           WHEN s.vt <> 'admin' AND dang_bao_tri() THEN NULL
           ELSE s.vt
         END
    FROM (SELECT vai_tro_hien_tai() AS vt) s
$$;

-- Kiểm tra quyền sở hữu (chủ nuôi chỉ thấy dữ liệu của chính mình).
CREATE FUNCTION la_chu_nuoi_cua(p_chu_nuoi uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (SELECT 1 FROM chu_nuoi c
                  WHERE c.id = p_chu_nuoi AND c.tai_khoan_id = auth.uid())
$$;

CREATE FUNCTION la_chu_thu_cung(p_thu_cung uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (SELECT 1 FROM thu_cung t JOIN chu_nuoi c ON c.id = t.chu_nuoi_id
                  WHERE t.id = p_thu_cung AND c.tai_khoan_id = auth.uid())
$$;

CREATE FUNCTION la_chu_lich_hen(p_lich uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (SELECT 1 FROM lich_hen l
                   JOIN thu_cung t ON t.id = l.thu_cung_id
                   JOIN chu_nuoi c ON c.id = t.chu_nuoi_id
                  WHERE l.id = p_lich AND c.tai_khoan_id = auth.uid())
$$;

CREATE FUNCTION la_chu_ho_so_kham(p_ho_so uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (SELECT 1 FROM ho_so_kham h WHERE h.id = p_ho_so AND la_chu_lich_hen(h.lich_hen_id))
$$;

CREATE FUNCTION la_chu_don_thuoc(p_don uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (SELECT 1 FROM don_thuoc d WHERE d.id = p_don AND la_chu_ho_so_kham(d.ho_so_kham_id))
$$;

CREATE FUNCTION la_chu_hoa_don(p_hoa_don uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (SELECT 1 FROM hoa_don h WHERE h.id = p_hoa_don AND la_chu_lich_hen(h.lich_hen_id))
$$;

-- Ném lỗi nghiệp vụ dạng 'MA_LOI: mô tả'.
CREATE FUNCTION _loi(p_ma text, p_mo_ta text) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION '%: %', p_ma, p_mo_ta USING ERRCODE = 'P0001', HINT = p_ma;
END
$$;

-- Yêu cầu người gọi có một trong các vai trò liệt kê (admin luôn được phép).
-- Trả về vai trò thực của người gọi.
CREATE FUNCTION _yeu_cau_vai_tro(VARIADIC p_cac text[] DEFAULT '{}') RETURNS text
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v text;
BEGIN
  IF auth.uid() IS NULL THEN
    PERFORM _loi('CHUA_DANG_NHAP', 'Bạn cần đăng nhập để thực hiện thao tác này');
  END IF;
  v := vai_tro_hien_tai();
  IF v IS NULL THEN
    PERFORM _loi('TAI_KHOAN_BI_KHOA', 'Tài khoản đã bị khóa hoặc không tồn tại');
  END IF;
  IF v <> 'admin' AND dang_bao_tri() THEN
    PERFORM _loi('HE_THONG_BAO_TRI', 'Hệ thống đang bảo trì, vui lòng quay lại sau');
  END IF;
  IF v <> 'admin' AND NOT (v = ANY (p_cac)) THEN
    PERFORM _loi('KHONG_CO_QUYEN', 'Bạn không có quyền thực hiện thao tác này');
  END IF;
  RETURN v;
END
$$;

-- Giới hạn tần suất theo người dùng: tối đa p_toi_da lần gọi p_hanh_dong trong p_giay giây.
-- Chỉ áp dụng cho chủ nuôi (nhân viên và admin cần thao tác hàng loạt nên không bị giới hạn).
CREATE FUNCTION _gioi_han(p_hanh_dong text, p_toi_da integer, p_giay integer) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  DELETE FROM gioi_han_goi WHERE nguoi_dung_id = auth.uid() AND thoi_gian < now() - interval '1 hour';
  IF (SELECT count(*) FROM gioi_han_goi
       WHERE nguoi_dung_id = auth.uid() AND hanh_dong = p_hanh_dong
         AND thoi_gian > now() - make_interval(secs => p_giay)) >= p_toi_da THEN
    PERFORM _loi('QUA_NHIEU_YEU_CAU', 'Bạn thao tác quá nhanh, vui lòng chờ một lát rồi thử lại');
  END IF;
  INSERT INTO gioi_han_goi (nguoi_dung_id, hanh_dong) VALUES (auth.uid(), p_hanh_dong);
END
$$;

-- ---------------------------------------------------------------------
-- B. KHUNG GIỜ TRỐNG
-- ---------------------------------------------------------------------

-- Nội bộ: các khung giờ còn trống của một bác sĩ trong một ngày (giờ Việt Nam).
-- p_ap_gioi_han = true: áp quy tắc đặt trước tối thiểu/tối đa dành cho chủ nuôi.
CREATE FUNCTION _khung_gio(p_bac_si uuid, p_ngay date, p_ap_gioi_han boolean)
RETURNS TABLE (thoi_gian timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_phut    integer := greatest(cau_hinh_so('do_dai_khung_gio_phut', 30), 5);
  v_min_gio integer := cau_hinh_so('dat_truoc_toi_thieu_gio', 2);
  v_max_ngay integer := cau_hinh_so('dat_truoc_toi_da_ngay', 30);
BEGIN
  RETURN QUERY
  SELECT DISTINCT s.t
    FROM lich_lam_viec w
   CROSS JOIN LATERAL generate_series(
           (p_ngay + w.gio_bat_dau) AT TIME ZONE 'Asia/Ho_Chi_Minh',
           (p_ngay + w.gio_ket_thuc) AT TIME ZONE 'Asia/Ho_Chi_Minh' - make_interval(mins => v_phut),
           make_interval(mins => v_phut)) AS s(t)
   WHERE w.bac_si_id = p_bac_si
     AND w.thu_trong_tuan = extract(isodow FROM p_ngay)::integer
     AND EXISTS (SELECT 1 FROM tai_khoan k
                  WHERE k.id = p_bac_si AND k.vai_tro = 'bac_si' AND k.trang_thai = 'hoat_dong')
     AND s.t > now()
     AND NOT EXISTS (SELECT 1 FROM lich_hen l
                      WHERE l.bac_si_id = p_bac_si AND l.thoi_gian = s.t AND l.trang_thai <> 'da_huy')
     AND (NOT p_ap_gioi_han
          OR (s.t >= now() + make_interval(hours => v_min_gio)
              AND s.t < ((hom_nay() + v_max_ngay + 1)::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh')))
   ORDER BY s.t;
END
$$;

-- Công khai cho chủ nuôi và lễ tân. Lễ tân/admin không bị giới hạn đặt trước.
CREATE FUNCTION khung_gio_trong(p_bac_si uuid, p_ngay date)
RETURNS TABLE (thoi_gian timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_vt text;
BEGIN
  v_vt := _yeu_cau_vai_tro('chu_nuoi', 'le_tan');
  IF v_vt = 'chu_nuoi' THEN PERFORM _gioi_han('khung_gio_trong', 30, 60); END IF;
  RETURN QUERY
  SELECT g.thoi_gian FROM _khung_gio(p_bac_si, p_ngay, v_vt = 'chu_nuoi') g;
END
$$;

-- ---------------------------------------------------------------------
-- C. VÒNG ĐỜI LỊCH HẸN
-- ---------------------------------------------------------------------

-- CN04 / LT03: đặt lịch khám hoặc tiêm. Chủ nuôi đặt cho thú cưng của mình
-- (trạng thái cho_xac_nhan); lễ tân/admin đặt hộ (tự động da_xac_nhan).
CREATE FUNCTION dat_lich(
  p_thu_cung  uuid,
  p_bac_si    uuid,
  p_dich_vu   uuid,
  p_thoi_gian timestamptz,
  p_vaccine   uuid DEFAULT NULL,
  p_ghi_chu   text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_vt   text;
  v_dv   dich_vu%ROWTYPE;
  v_chu  uuid;
  v_dem  integer;
  v_id   uuid;
  v_nhan boolean;
BEGIN
  v_vt := _yeu_cau_vai_tro('chu_nuoi', 'le_tan');
  IF v_vt = 'chu_nuoi' THEN PERFORM _gioi_han('dat_lich', 10, 60); END IF;
  v_nhan := v_vt <> 'chu_nuoi';   -- nhân viên đặt hộ thì xác nhận luôn

  SELECT t.chu_nuoi_id INTO v_chu FROM thu_cung t WHERE t.id = p_thu_cung;
  IF v_chu IS NULL THEN
    PERFORM _loi('THU_CUNG_KHONG_TON_TAI', 'Không tìm thấy thú cưng');
  END IF;
  IF v_vt = 'chu_nuoi' AND NOT la_chu_thu_cung(p_thu_cung) THEN
    PERFORM _loi('KHONG_CO_QUYEN', 'Thú cưng này không thuộc tài khoản của bạn');
  END IF;

  SELECT * INTO v_dv FROM dich_vu WHERE id = p_dich_vu AND dang_ap_dung;
  IF NOT FOUND THEN
    PERFORM _loi('DICH_VU_KHONG_HOP_LE', 'Dịch vụ không tồn tại hoặc đã ngừng áp dụng');
  END IF;

  IF v_dv.loai = 'tiem' THEN
    IF p_vaccine IS NULL THEN
      PERFORM _loi('VACCINE_BAT_BUOC', 'Dịch vụ tiêm phòng cần chọn loại vaccine');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM thuoc WHERE id = p_vaccine AND loai = 'vaccine' AND dang_ap_dung) THEN
      PERFORM _loi('VACCINE_KHONG_HOP_LE', 'Vaccine không tồn tại hoặc đã ngừng sử dụng');
    END IF;
  ELSIF p_vaccine IS NOT NULL THEN
    PERFORM _loi('VACCINE_KHONG_HOP_LE', 'Dịch vụ khám bệnh không chọn vaccine');
  END IF;

  IF v_vt = 'chu_nuoi' THEN
    SELECT count(*) INTO v_dem
      FROM lich_hen l JOIN thu_cung t ON t.id = l.thu_cung_id
     WHERE t.chu_nuoi_id = v_chu
       AND l.trang_thai IN ('cho_xac_nhan', 'da_xac_nhan')
       AND l.thoi_gian > now();
    IF v_dem >= cau_hinh_so('gioi_han_lich_cho', 5) THEN
      PERFORM _loi('VUOT_GIOI_HAN_LICH',
                   'Bạn đã có quá nhiều lịch chưa diễn ra, vui lòng hoàn tất hoặc hủy bớt');
    END IF;
  END IF;

  IF NOT EXISTS (
       SELECT 1 FROM _khung_gio(p_bac_si,
                                (p_thoi_gian AT TIME ZONE 'Asia/Ho_Chi_Minh')::date,
                                v_vt = 'chu_nuoi') g
        WHERE g.thoi_gian = p_thoi_gian) THEN
    IF EXISTS (SELECT 1 FROM lich_hen
                WHERE bac_si_id = p_bac_si AND thoi_gian = p_thoi_gian AND trang_thai <> 'da_huy') THEN
      PERFORM _loi('KHUNG_GIO_DA_DAT', 'Khung giờ này đã có người đặt, vui lòng chọn giờ khác');
    END IF;
    PERFORM _loi('KHUNG_GIO_KHONG_HOP_LE',
                 'Khung giờ không hợp lệ (ngoài giờ làm việc, đã qua hoặc ngoài thời hạn đặt trước)');
  END IF;

  BEGIN
    INSERT INTO lich_hen (thu_cung_id, bac_si_id, dich_vu_id, vaccine_id, thoi_gian,
                          trang_thai, nguoi_xac_nhan_id, ghi_chu)
    VALUES (p_thu_cung, p_bac_si, p_dich_vu, p_vaccine, p_thoi_gian,
            CASE WHEN v_nhan THEN 'da_xac_nhan' ELSE 'cho_xac_nhan' END,
            CASE WHEN v_nhan THEN auth.uid() END,
            nullif(btrim(p_ghi_chu), ''))
    RETURNING id INTO v_id;
  EXCEPTION WHEN unique_violation THEN
    PERFORM _loi('KHUNG_GIO_DA_DAT', 'Khung giờ này vừa có người đặt, vui lòng chọn giờ khác');
  END;
  RETURN v_id;
END
$$;

-- CN06 / LT04: đổi giờ (và tùy chọn đổi bác sĩ). Chủ nuôi đổi xong phải chờ xác nhận lại.
CREATE FUNCTION doi_lich(p_lich uuid, p_thoi_gian timestamptz, p_bac_si uuid DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_vt  text;
  v_l   lich_hen%ROWTYPE;
  v_bs  uuid;
  v_nhan boolean;
BEGIN
  v_vt := _yeu_cau_vai_tro('chu_nuoi', 'le_tan');
  IF v_vt = 'chu_nuoi' THEN PERFORM _gioi_han('doi_lich', 10, 60); END IF;
  v_nhan := v_vt <> 'chu_nuoi';

  SELECT * INTO v_l FROM lich_hen WHERE id = p_lich FOR UPDATE;
  IF NOT FOUND THEN
    PERFORM _loi('LICH_KHONG_TON_TAI', 'Không tìm thấy lịch hẹn');
  END IF;
  IF v_vt = 'chu_nuoi' AND NOT la_chu_lich_hen(p_lich) THEN
    PERFORM _loi('KHONG_CO_QUYEN', 'Lịch hẹn này không thuộc tài khoản của bạn');
  END IF;
  IF v_l.trang_thai NOT IN ('cho_xac_nhan', 'da_xac_nhan') THEN
    PERFORM _loi('LICH_KHONG_HOP_LE', 'Chỉ đổi được lịch đang chờ xác nhận hoặc đã xác nhận');
  END IF;
  IF v_vt = 'chu_nuoi'
     AND v_l.thoi_gian < now() + make_interval(hours => cau_hinh_so('huy_doi_truoc_gio', 2)) THEN
    PERFORM _loi('QUA_HAN_DOI_HUY', 'Đã quá hạn đổi lịch, vui lòng liên hệ phòng khám');
  END IF;

  v_bs := coalesce(p_bac_si, v_l.bac_si_id);
  IF v_bs = v_l.bac_si_id AND p_thoi_gian = v_l.thoi_gian THEN
    PERFORM _loi('KHONG_THAY_DOI', 'Giờ hẹn mới trùng với giờ hẹn hiện tại');
  END IF;

  IF NOT EXISTS (
       SELECT 1 FROM _khung_gio(v_bs,
                                (p_thoi_gian AT TIME ZONE 'Asia/Ho_Chi_Minh')::date,
                                v_vt = 'chu_nuoi') g
        WHERE g.thoi_gian = p_thoi_gian) THEN
    IF EXISTS (SELECT 1 FROM lich_hen
                WHERE bac_si_id = v_bs AND thoi_gian = p_thoi_gian AND trang_thai <> 'da_huy') THEN
      PERFORM _loi('KHUNG_GIO_DA_DAT', 'Khung giờ này đã có người đặt, vui lòng chọn giờ khác');
    END IF;
    PERFORM _loi('KHUNG_GIO_KHONG_HOP_LE',
                 'Khung giờ không hợp lệ (ngoài giờ làm việc, đã qua hoặc ngoài thời hạn đặt trước)');
  END IF;

  BEGIN
    UPDATE lich_hen
       SET thoi_gian = p_thoi_gian,
           bac_si_id = v_bs,
           trang_thai = CASE WHEN v_nhan THEN 'da_xac_nhan' ELSE 'cho_xac_nhan' END,
           nguoi_xac_nhan_id = CASE WHEN v_nhan THEN auth.uid() END
     WHERE id = p_lich;
  EXCEPTION WHEN unique_violation THEN
    PERFORM _loi('KHUNG_GIO_DA_DAT', 'Khung giờ này vừa có người đặt, vui lòng chọn giờ khác');
  END;
END
$$;

-- CN06 / LT04: hủy lịch. Chủ nuôi chỉ hủy trước giờ hẹn tối thiểu theo cấu hình.
CREATE FUNCTION huy_lich(p_lich uuid, p_ly_do text DEFAULT NULL) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_vt text;
  v_l  lich_hen%ROWTYPE;
BEGIN
  v_vt := _yeu_cau_vai_tro('chu_nuoi', 'le_tan');
  IF v_vt = 'chu_nuoi' THEN PERFORM _gioi_han('huy_lich', 10, 60); END IF;
  SELECT * INTO v_l FROM lich_hen WHERE id = p_lich FOR UPDATE;
  IF NOT FOUND THEN
    PERFORM _loi('LICH_KHONG_TON_TAI', 'Không tìm thấy lịch hẹn');
  END IF;
  IF v_vt = 'chu_nuoi' AND NOT la_chu_lich_hen(p_lich) THEN
    PERFORM _loi('KHONG_CO_QUYEN', 'Lịch hẹn này không thuộc tài khoản của bạn');
  END IF;
  IF v_l.trang_thai NOT IN ('cho_xac_nhan', 'da_xac_nhan') THEN
    PERFORM _loi('LICH_KHONG_HOP_LE', 'Chỉ hủy được lịch đang chờ xác nhận hoặc đã xác nhận');
  END IF;
  IF v_vt = 'chu_nuoi'
     AND v_l.thoi_gian < now() + make_interval(hours => cau_hinh_so('huy_doi_truoc_gio', 2)) THEN
    PERFORM _loi('QUA_HAN_DOI_HUY', 'Đã quá hạn hủy lịch, vui lòng liên hệ phòng khám');
  END IF;
  UPDATE lich_hen
     SET trang_thai = 'da_huy',
         ly_do_huy = coalesce(nullif(btrim(p_ly_do), ''), 'Không nêu lý do')
   WHERE id = p_lich;
END
$$;

-- Chủ nuôi đánh giá lần khám đã hoàn thành (gửi mới hoặc sửa đánh giá của chính mình).
CREATE FUNCTION gui_danh_gia(p_lich uuid, p_so_sao integer, p_nhan_xet text DEFAULT NULL) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_l lich_hen%ROWTYPE;
BEGIN
  PERFORM _yeu_cau_vai_tro('chu_nuoi');
  PERFORM _gioi_han('gui_danh_gia', 20, 3600);
  IF p_so_sao IS NULL OR p_so_sao NOT BETWEEN 1 AND 5 THEN
    PERFORM _loi('SO_SAO_KHONG_HOP_LE', 'Số sao phải từ 1 đến 5');
  END IF;
  IF p_nhan_xet IS NOT NULL AND length(btrim(p_nhan_xet)) > 500 THEN
    PERFORM _loi('NHAN_XET_QUA_DAI', 'Nhận xét tối đa 500 ký tự');
  END IF;
  SELECT * INTO v_l FROM lich_hen WHERE id = p_lich;
  IF NOT FOUND OR NOT la_chu_lich_hen(p_lich) THEN
    PERFORM _loi('KHONG_CO_QUYEN', 'Lịch hẹn này không thuộc tài khoản của bạn');
  END IF;
  IF v_l.trang_thai <> 'da_hoan_thanh' THEN
    PERFORM _loi('LICH_CHUA_HOAN_THANH', 'Chỉ đánh giá được lần khám đã hoàn thành');
  END IF;
  INSERT INTO danh_gia (lich_hen_id, so_sao, nhan_xet)
  VALUES (p_lich, p_so_sao, nullif(btrim(p_nhan_xet), ''))
  ON CONFLICT (lich_hen_id) DO UPDATE SET so_sao = EXCLUDED.so_sao, nhan_xet = EXCLUDED.nhan_xet;
END
$$;

-- Admin ẩn hoặc hiện lại một đánh giá trên trang công khai.
CREATE FUNCTION an_hien_danh_gia(p_id uuid, p_hien boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  PERFORM _yeu_cau_vai_tro('admin');
  UPDATE danh_gia SET hien_thi = coalesce(p_hien, true) WHERE id = p_id;
  IF NOT FOUND THEN PERFORM _loi('DANH_GIA_KHONG_TON_TAI', 'Không tìm thấy đánh giá'); END IF;
END
$$;

-- LT02: lễ tân xác nhận lịch đang chờ.
CREATE FUNCTION xac_nhan_lich(p_lich uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_l lich_hen%ROWTYPE;
BEGIN
  PERFORM _yeu_cau_vai_tro('le_tan');
  SELECT * INTO v_l FROM lich_hen WHERE id = p_lich FOR UPDATE;
  IF NOT FOUND THEN
    PERFORM _loi('LICH_KHONG_TON_TAI', 'Không tìm thấy lịch hẹn');
  END IF;
  IF v_l.trang_thai <> 'cho_xac_nhan' THEN
    PERFORM _loi('LICH_KHONG_HOP_LE', 'Lịch không còn ở trạng thái chờ xác nhận');
  END IF;
  IF v_l.thoi_gian <= now() THEN
    PERFORM _loi('LICH_DA_QUA', 'Lịch hẹn đã qua giờ, không thể xác nhận');
  END IF;
  UPDATE lich_hen SET trang_thai = 'da_xac_nhan', nguoi_xac_nhan_id = auth.uid() WHERE id = p_lich;
END
$$;

-- Lễ tân đánh dấu khách không đến (chỉ khi đã qua giờ hẹn).
CREATE FUNCTION danh_dau_khong_den(p_lich uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_l lich_hen%ROWTYPE;
BEGIN
  PERFORM _yeu_cau_vai_tro('le_tan');
  SELECT * INTO v_l FROM lich_hen WHERE id = p_lich FOR UPDATE;
  IF NOT FOUND THEN
    PERFORM _loi('LICH_KHONG_TON_TAI', 'Không tìm thấy lịch hẹn');
  END IF;
  IF v_l.trang_thai <> 'da_xac_nhan' THEN
    PERFORM _loi('LICH_KHONG_HOP_LE', 'Chỉ đánh dấu không đến với lịch đã xác nhận');
  END IF;
  IF v_l.thoi_gian > now() THEN
    PERFORM _loi('LICH_CHUA_DEN_GIO', 'Lịch hẹn chưa đến giờ');
  END IF;
  UPDATE lich_hen SET trang_thai = 'khong_den' WHERE id = p_lich;
END
$$;

-- ---------------------------------------------------------------------
-- D. KHÁM BỆNH, KÊ ĐƠN, TIÊM PHÒNG
-- ---------------------------------------------------------------------

-- Nội bộ: xuất kho theo nguyên tắc FEFO (lô gần hết hạn xuất trước), không xuất lô quá hạn.
-- Khóa các lô của thuốc để hai người không cùng xuất vượt tồn. Thiếu hàng thì ném lỗi
-- và toàn bộ giao dịch của hàm gọi bị hủy.
CREATE FUNCTION _xuat_kho(p_thuoc uuid, p_so_luong integer, p_loai text,
                          p_ct_don uuid, p_mui_tiem uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_con integer := p_so_luong;
  v_ton integer;
  v_lay integer;
  r     record;
  v_thuoc thuoc%ROWTYPE;
BEGIN
  PERFORM 1 FROM lo_thuoc WHERE thuoc_id = p_thuoc ORDER BY han_dung, id FOR UPDATE;

  FOR r IN SELECT l.id FROM lo_thuoc l
            WHERE l.thuoc_id = p_thuoc AND l.han_dung >= hom_nay()
            ORDER BY l.han_dung, l.id
  LOOP
    SELECT coalesce(sum(b.so_luong), 0) INTO v_ton FROM bien_dong_kho b WHERE b.lo_thuoc_id = r.id;
    IF v_ton > 0 THEN
      v_lay := least(v_ton, v_con);
      INSERT INTO bien_dong_kho (lo_thuoc_id, nguoi_thuc_hien_id, loai, so_luong, ct_don_thuoc_id, mui_tiem_id)
      VALUES (r.id, auth.uid(), p_loai, -v_lay, p_ct_don, p_mui_tiem);
      v_con := v_con - v_lay;
    END IF;
    EXIT WHEN v_con = 0;
  END LOOP;

  IF v_con > 0 THEN
    SELECT * INTO v_thuoc FROM thuoc WHERE id = p_thuoc;
    PERFORM _loi('KHO_KHONG_DU',
                 format('Thuốc "%s" không đủ tồn kho (thiếu %s %s)', v_thuoc.ten, v_con, v_thuoc.don_vi));
  END IF;
END
$$;

-- BS03: bác sĩ ghi hoặc cập nhật hồ sơ khám; lịch chuyển sang đã hoàn thành.
CREATE FUNCTION ghi_ho_so_kham(
  p_lich      uuid,
  p_chan_doan text,
  p_can_nang  numeric DEFAULT NULL,
  p_nhiet_do  numeric DEFAULT NULL,
  p_ghi_chu   text    DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_vt text;
  v_l  lich_hen%ROWTYPE;
  v_id uuid;
BEGIN
  v_vt := _yeu_cau_vai_tro('bac_si');
  IF p_chan_doan IS NULL OR length(btrim(p_chan_doan)) = 0 THEN
    PERFORM _loi('THIEU_CHAN_DOAN', 'Vui lòng nhập chẩn đoán');
  END IF;
  SELECT * INTO v_l FROM lich_hen WHERE id = p_lich FOR UPDATE;
  IF NOT FOUND THEN
    PERFORM _loi('LICH_KHONG_TON_TAI', 'Không tìm thấy lịch hẹn');
  END IF;
  IF v_vt = 'bac_si' AND v_l.bac_si_id <> auth.uid() THEN
    PERFORM _loi('KHONG_CO_QUYEN', 'Đây không phải lịch khám của bạn');
  END IF;
  IF v_l.trang_thai NOT IN ('da_xac_nhan', 'da_hoan_thanh') THEN
    PERFORM _loi('LICH_KHONG_HOP_LE', 'Chỉ ghi hồ sơ cho lịch đã được xác nhận');
  END IF;

  INSERT INTO ho_so_kham (lich_hen_id, chan_doan, can_nang, nhiet_do, ghi_chu)
  VALUES (p_lich, btrim(p_chan_doan), p_can_nang, p_nhiet_do, nullif(btrim(p_ghi_chu), ''))
  ON CONFLICT (lich_hen_id) DO UPDATE
     SET chan_doan = EXCLUDED.chan_doan,
         can_nang  = EXCLUDED.can_nang,
         nhiet_do  = EXCLUDED.nhiet_do,
         ghi_chu   = EXCLUDED.ghi_chu
  RETURNING id INTO v_id;

  UPDATE lich_hen SET trang_thai = 'da_hoan_thanh' WHERE id = p_lich AND trang_thai <> 'da_hoan_thanh';
  RETURN v_id;
END
$$;

-- BS04: kê đơn thuốc và trừ kho trong cùng một giao dịch.
-- p_dong: [{"thuoc_id":"...","so_luong":2,"lieu_dung":"Ngày 2 lần, sau ăn"}, ...]
-- Gọi lại với cùng hồ sơ khám sẽ thay thế đơn cũ (hoàn kho đơn cũ) nếu chưa lập hóa đơn.
CREATE FUNCTION ke_don(p_ho_so uuid, p_dong jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_vt  text;
  v_hs  ho_so_kham%ROWTYPE;
  v_l   lich_hen%ROWTYPE;
  v_don uuid;
  v_ct  uuid;
  d     record;
  v_t   thuoc%ROWTYPE;
BEGIN
  v_vt := _yeu_cau_vai_tro('bac_si');

  SELECT * INTO v_hs FROM ho_so_kham WHERE id = p_ho_so FOR UPDATE;
  IF NOT FOUND THEN
    PERFORM _loi('HO_SO_KHONG_TON_TAI', 'Không tìm thấy hồ sơ khám');
  END IF;
  SELECT * INTO v_l FROM lich_hen WHERE id = v_hs.lich_hen_id FOR UPDATE;
  IF v_vt = 'bac_si' AND v_l.bac_si_id <> auth.uid() THEN
    PERFORM _loi('KHONG_CO_QUYEN', 'Đây không phải hồ sơ khám của bạn');
  END IF;
  IF EXISTS (SELECT 1 FROM hoa_don WHERE lich_hen_id = v_l.id AND trang_thai <> 'da_huy') THEN
    PERFORM _loi('DA_LAP_HOA_DON', 'Lịch này đã lập hóa đơn, không thể thay đổi đơn thuốc');
  END IF;

  IF p_dong IS NULL OR jsonb_typeof(p_dong) <> 'array' OR jsonb_array_length(p_dong) = 0 THEN
    PERFORM _loi('DON_THUOC_TRONG', 'Đơn thuốc phải có ít nhất một thuốc');
  END IF;
  BEGIN
    -- Ép kiểu thật sự (dùng sum để planner không bỏ qua cột), sai kiểu sẽ nhảy vào EXCEPTION.
    PERFORM sum(((e->>'so_luong')::integer) + length(((e->>'thuoc_id')::uuid)::text))
       FROM jsonb_array_elements(p_dong) e;
  EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range OR invalid_parameter_value THEN
    PERFORM _loi('DU_LIEU_DON_KHONG_HOP_LE', 'Dữ liệu đơn thuốc không đúng định dạng');
  END;
  IF (SELECT count(*) <> count(DISTINCT e->>'thuoc_id') FROM jsonb_array_elements(p_dong) e) THEN
    PERFORM _loi('THUOC_TRUNG', 'Một thuốc không được xuất hiện hai lần trong cùng đơn');
  END IF;

  SELECT id INTO v_don FROM don_thuoc WHERE ho_so_kham_id = p_ho_so;
  IF v_don IS NULL THEN
    INSERT INTO don_thuoc (ho_so_kham_id) VALUES (p_ho_so) RETURNING id INTO v_don;
  ELSE
    -- Thay thế đơn cũ: hoàn kho các lô đã xuất rồi xóa các dòng cũ.
    INSERT INTO bien_dong_kho (lo_thuoc_id, nguoi_thuc_hien_id, loai, so_luong, ly_do)
    SELECT b.lo_thuoc_id, auth.uid(), 'dieu_chinh', -b.so_luong, 'Hoàn kho do kê lại đơn thuốc'
      FROM bien_dong_kho b JOIN ct_don_thuoc c ON c.id = b.ct_don_thuoc_id
     WHERE c.don_thuoc_id = v_don;
    DELETE FROM ct_don_thuoc WHERE don_thuoc_id = v_don;
  END IF;

  -- Xử lý theo thứ tự thuoc_id để hai giao dịch song song không khóa chéo nhau.
  FOR d IN
    SELECT (e->>'thuoc_id')::uuid AS thuoc_id,
           (e->>'so_luong')::integer AS so_luong,
           btrim(coalesce(e->>'lieu_dung', '')) AS lieu_dung
      FROM jsonb_array_elements(p_dong) e
     ORDER BY 1
  LOOP
    IF d.so_luong IS NULL OR d.so_luong <= 0 THEN
      PERFORM _loi('SO_LUONG_KHONG_HOP_LE', 'Số lượng thuốc phải lớn hơn 0');
    END IF;
    IF d.lieu_dung = '' THEN
      PERFORM _loi('THIEU_LIEU_DUNG', 'Mỗi thuốc cần có liều dùng');
    END IF;
    SELECT * INTO v_t FROM thuoc WHERE id = d.thuoc_id AND loai = 'thuoc' AND dang_ap_dung;
    IF NOT FOUND THEN
      PERFORM _loi('THUOC_KHONG_HOP_LE', 'Thuốc không tồn tại, là vaccine hoặc đã ngừng sử dụng');
    END IF;
    INSERT INTO ct_don_thuoc (don_thuoc_id, thuoc_id, so_luong, lieu_dung)
    VALUES (v_don, d.thuoc_id, d.so_luong, d.lieu_dung)
    RETURNING id INTO v_ct;
    PERFORM _xuat_kho(d.thuoc_id, d.so_luong, 'xuat_ke_don', v_ct, NULL);
  END LOOP;

  RETURN v_don;
END
$$;

-- BS05: ghi mũi tiêm đã thực hiện, trừ 1 liều vaccine trong kho, hẹn mũi tiếp theo.
CREATE FUNCTION ghi_tiem(p_lich uuid, p_ngay_tiem_tiep date DEFAULT NULL, p_vaccine uuid DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_vt  text;
  v_l   lich_hen%ROWTYPE;
  v_dv  dich_vu%ROWTYPE;
  v_vc  uuid;
  v_bs  uuid;
  v_ngay date := hom_nay();
  v_id  uuid;
BEGIN
  v_vt := _yeu_cau_vai_tro('bac_si');
  SELECT * INTO v_l FROM lich_hen WHERE id = p_lich FOR UPDATE;
  IF NOT FOUND THEN
    PERFORM _loi('LICH_KHONG_TON_TAI', 'Không tìm thấy lịch hẹn');
  END IF;
  IF v_vt = 'bac_si' AND v_l.bac_si_id <> auth.uid() THEN
    PERFORM _loi('KHONG_CO_QUYEN', 'Đây không phải lịch tiêm của bạn');
  END IF;
  SELECT * INTO v_dv FROM dich_vu WHERE id = v_l.dich_vu_id;
  IF v_dv.loai <> 'tiem' THEN
    PERFORM _loi('LICH_KHONG_PHAI_TIEM', 'Đây không phải lịch tiêm phòng');
  END IF;
  IF v_l.trang_thai NOT IN ('da_xac_nhan', 'da_hoan_thanh') THEN
    PERFORM _loi('LICH_KHONG_HOP_LE', 'Chỉ ghi mũi tiêm cho lịch đã được xác nhận');
  END IF;
  IF EXISTS (SELECT 1 FROM hoa_don WHERE lich_hen_id = v_l.id AND trang_thai <> 'da_huy') THEN
    PERFORM _loi('DA_LAP_HOA_DON', 'Lịch này đã lập hóa đơn, không thể ghi thêm mũi tiêm');
  END IF;

  v_vc := coalesce(p_vaccine, v_l.vaccine_id);
  IF v_vc IS NULL OR NOT EXISTS (SELECT 1 FROM thuoc WHERE id = v_vc AND loai = 'vaccine' AND dang_ap_dung) THEN
    PERFORM _loi('VACCINE_KHONG_HOP_LE', 'Vaccine không tồn tại hoặc đã ngừng sử dụng');
  END IF;
  IF EXISTS (SELECT 1 FROM mui_tiem WHERE lich_hen_id = v_l.id AND thuoc_id = v_vc) THEN
    PERFORM _loi('MUI_TIEM_DA_GHI', 'Mũi tiêm này đã được ghi cho lịch hẹn');
  END IF;
  IF p_ngay_tiem_tiep IS NOT NULL AND p_ngay_tiem_tiep <= v_ngay THEN
    PERFORM _loi('NGAY_TIEM_TIEP_KHONG_HOP_LE', 'Ngày tiêm tiếp theo phải sau hôm nay');
  END IF;

  v_bs := CASE WHEN v_vt = 'bac_si' THEN auth.uid() ELSE v_l.bac_si_id END;
  INSERT INTO mui_tiem (thu_cung_id, thuoc_id, bac_si_id, lich_hen_id, ngay_tiem, ngay_tiem_tiep)
  VALUES (v_l.thu_cung_id, v_vc, v_bs, v_l.id, v_ngay, p_ngay_tiem_tiep)
  RETURNING id INTO v_id;

  PERFORM _xuat_kho(v_vc, 1, 'xuat_tiem', NULL, v_id);
  UPDATE lich_hen SET trang_thai = 'da_hoan_thanh' WHERE id = p_lich AND trang_thai <> 'da_hoan_thanh';
  RETURN v_id;
END
$$;

-- BS07: xem lịch sử khám và đơn thuốc của một thú cưng. Bác sĩ và admin KHÔNG đọc trực tiếp
-- các bảng hồ sơ khám, đơn thuốc; bắt buộc đi qua hàm này để mỗi lần mở hồ sơ được ghi vào nhật ký.
-- Chủ nuôi vẫn đọc hồ sơ của chính mình trực tiếp qua RLS (không cần ghi nhật ký).
CREATE FUNCTION xem_ho_so_kham(p_thu_cung uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_ket jsonb;
BEGIN
  PERFORM _yeu_cau_vai_tro('bac_si');
  IF NOT EXISTS (SELECT 1 FROM thu_cung WHERE id = p_thu_cung) THEN
    PERFORM _loi('THU_CUNG_KHONG_TON_TAI', 'Không tìm thấy thú cưng');
  END IF;

  SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.thoi_gian DESC), '[]'::jsonb) INTO v_ket
    FROM (
      SELECT l.id AS lich_hen_id, l.thoi_gian, l.trang_thai, l.ghi_chu AS ghi_chu_dat_lich,
             d.ten AS dich_vu, k.ho_ten AS bac_si,
             h.id AS ho_so_id, h.chan_doan, h.can_nang, h.nhiet_do, h.ghi_chu,
             (SELECT coalesce(jsonb_agg(jsonb_build_object('thuoc', t.ten, 'don_vi', t.don_vi,
                                                           'so_luong', c.so_luong, 'lieu_dung', c.lieu_dung)
                                        ORDER BY t.ten), '[]'::jsonb)
                FROM don_thuoc dt
                JOIN ct_don_thuoc c ON c.don_thuoc_id = dt.id
                JOIN thuoc t ON t.id = c.thuoc_id
               WHERE dt.ho_so_kham_id = h.id) AS don_thuoc
        FROM lich_hen l
        JOIN dich_vu d ON d.id = l.dich_vu_id
        JOIN tai_khoan k ON k.id = l.bac_si_id
        LEFT JOIN ho_so_kham h ON h.lich_hen_id = l.id
       WHERE l.thu_cung_id = p_thu_cung AND l.trang_thai IN ('da_xac_nhan', 'da_hoan_thanh')
    ) x;

  INSERT INTO nhat_ky (tai_khoan_id, hanh_dong, bang_tac_dong, ban_ghi_id, gia_tri_moi)
  VALUES (auth.uid(), 'xem', 'ho_so_kham', p_thu_cung,
          jsonb_build_object('thu_cung_id', p_thu_cung, 'so_lan_kham', jsonb_array_length(v_ket)));
  RETURN v_ket;
END
$$;

-- ---------------------------------------------------------------------
-- E. KHO THUỐC
-- ---------------------------------------------------------------------

-- KT02: nhập kho. Lô chưa có thì tạo; lô đã có phải cùng hạn dùng.
CREATE FUNCTION nhap_kho(p_thuoc uuid, p_so_lo text, p_han_dung date, p_so_luong integer)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_lo  lo_thuoc%ROWTYPE;
BEGIN
  PERFORM _yeu_cau_vai_tro('kho');
  IF p_so_luong IS NULL OR p_so_luong <= 0 THEN
    PERFORM _loi('SO_LUONG_KHONG_HOP_LE', 'Số lượng nhập phải lớn hơn 0');
  END IF;
  IF p_so_lo IS NULL OR length(btrim(p_so_lo)) = 0 THEN
    PERFORM _loi('THIEU_SO_LO', 'Vui lòng nhập số lô');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM thuoc WHERE id = p_thuoc AND dang_ap_dung) THEN
    PERFORM _loi('THUOC_KHONG_HOP_LE', 'Thuốc không tồn tại hoặc đã ngừng sử dụng');
  END IF;
  IF p_han_dung IS NULL OR p_han_dung < hom_nay() THEN
    PERFORM _loi('HAN_DUNG_KHONG_HOP_LE', 'Hạn dùng phải từ hôm nay trở đi');
  END IF;

  INSERT INTO lo_thuoc (thuoc_id, so_lo, han_dung)
  VALUES (p_thuoc, btrim(p_so_lo), p_han_dung)
  ON CONFLICT (thuoc_id, so_lo) DO NOTHING;
  SELECT * INTO v_lo FROM lo_thuoc WHERE thuoc_id = p_thuoc AND so_lo = btrim(p_so_lo) FOR UPDATE;
  IF v_lo.han_dung <> p_han_dung THEN
    PERFORM _loi('LO_KHAC_HAN_DUNG', 'Lô này đã tồn tại với hạn dùng khác');
  END IF;

  INSERT INTO bien_dong_kho (lo_thuoc_id, nguoi_thuc_hien_id, loai, so_luong)
  VALUES (v_lo.id, auth.uid(), 'nhap', p_so_luong);
  RETURN v_lo.id;
END
$$;

-- KT05: kiểm kê, đặt lại tồn của một lô về số đếm thực tế. Bắt buộc ghi lý do.
CREATE FUNCTION dieu_chinh_kho(p_lo uuid, p_so_luong_moi integer, p_ly_do text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_ton integer;
BEGIN
  PERFORM _yeu_cau_vai_tro('kho');
  IF p_ly_do IS NULL OR length(btrim(p_ly_do)) = 0 THEN
    PERFORM _loi('THIEU_LY_DO', 'Điều chỉnh kho bắt buộc ghi lý do');
  END IF;
  IF p_so_luong_moi IS NULL OR p_so_luong_moi < 0 THEN
    PERFORM _loi('SO_LUONG_KHONG_HOP_LE', 'Tồn kho sau điều chỉnh không được âm');
  END IF;
  PERFORM 1 FROM lo_thuoc WHERE id = p_lo FOR UPDATE;
  IF NOT FOUND THEN
    PERFORM _loi('LO_KHONG_TON_TAI', 'Không tìm thấy lô thuốc');
  END IF;
  SELECT coalesce(sum(so_luong), 0) INTO v_ton FROM bien_dong_kho WHERE lo_thuoc_id = p_lo;
  IF p_so_luong_moi = v_ton THEN
    PERFORM _loi('KHONG_THAY_DOI', 'Số lượng mới bằng tồn kho hiện tại');
  END IF;
  INSERT INTO bien_dong_kho (lo_thuoc_id, nguoi_thuc_hien_id, loai, so_luong, ly_do)
  VALUES (p_lo, auth.uid(), 'dieu_chinh', p_so_luong_moi - v_ton, btrim(p_ly_do));
END
$$;

-- ---------------------------------------------------------------------
-- F. HÓA ĐƠN VÀ THANH TOÁN
-- ---------------------------------------------------------------------

-- TN01: lập hóa đơn cho lịch đã hoàn thành. Chép giá tại thời điểm lập.
CREATE FUNCTION lap_hoa_don(p_lich uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_l    lich_hen%ROWTYPE;
  v_hd   uuid;
  v_tong integer;
BEGIN
  PERFORM _yeu_cau_vai_tro('thu_ngan');
  SELECT * INTO v_l FROM lich_hen WHERE id = p_lich FOR UPDATE;
  IF NOT FOUND THEN
    PERFORM _loi('LICH_KHONG_TON_TAI', 'Không tìm thấy lịch hẹn');
  END IF;
  IF v_l.trang_thai <> 'da_hoan_thanh' THEN
    PERFORM _loi('LICH_CHUA_HOAN_THANH', 'Chỉ lập hóa đơn cho lịch đã hoàn thành');
  END IF;
  IF EXISTS (SELECT 1 FROM hoa_don WHERE lich_hen_id = p_lich AND trang_thai <> 'da_huy') THEN
    PERFORM _loi('DA_LAP_HOA_DON', 'Lịch này đã có hóa đơn');
  END IF;

  INSERT INTO hoa_don (lich_hen_id, thu_ngan_id, tong_tien)
  VALUES (p_lich, auth.uid(), 0) RETURNING id INTO v_hd;

  INSERT INTO ct_hoa_don (hoa_don_id, mo_ta, so_luong, don_gia)
  SELECT v_hd, 'Dịch vụ: ' || d.ten, 1, d.gia
    FROM dich_vu d WHERE d.id = v_l.dich_vu_id
  UNION ALL
  SELECT v_hd, 'Thuốc: ' || t.ten || ' (' || t.don_vi || ')', c.so_luong, t.gia_ban
    FROM ho_so_kham h
    JOIN don_thuoc dt ON dt.ho_so_kham_id = h.id
    JOIN ct_don_thuoc c ON c.don_thuoc_id = dt.id
    JOIN thuoc t ON t.id = c.thuoc_id
   WHERE h.lich_hen_id = p_lich
  UNION ALL
  SELECT v_hd, 'Vaccine: ' || t.ten, 1, t.gia_ban
    FROM mui_tiem m JOIN thuoc t ON t.id = m.thuoc_id
   WHERE m.lich_hen_id = p_lich;

  SELECT coalesce(sum(thanh_tien), 0) INTO v_tong FROM ct_hoa_don WHERE hoa_don_id = v_hd;
  UPDATE hoa_don
     SET tong_tien = v_tong,
         trang_thai = CASE WHEN v_tong = 0 THEN 'da_thanh_toan' ELSE 'chua_thanh_toan' END
   WHERE id = v_hd;
  RETURN v_hd;
END
$$;

-- Hủy hóa đơn chưa có thanh toán (để lập lại khi có sai sót).
CREATE FUNCTION huy_hoa_don(p_hoa_don uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_h hoa_don%ROWTYPE;
BEGIN
  PERFORM _yeu_cau_vai_tro('thu_ngan');
  SELECT * INTO v_h FROM hoa_don WHERE id = p_hoa_don FOR UPDATE;
  IF NOT FOUND THEN
    PERFORM _loi('HOA_DON_KHONG_TON_TAI', 'Không tìm thấy hóa đơn');
  END IF;
  IF v_h.trang_thai = 'da_huy' THEN
    PERFORM _loi('HOA_DON_KHONG_HOP_LE', 'Hóa đơn đã được hủy trước đó');
  END IF;
  IF EXISTS (SELECT 1 FROM thanh_toan WHERE hoa_don_id = p_hoa_don) THEN
    PERFORM _loi('DA_CO_THANH_TOAN', 'Hóa đơn đã có thanh toán nên không thể hủy');
  END IF;
  UPDATE hoa_don SET trang_thai = 'da_huy' WHERE id = p_hoa_don;
END
$$;

-- TN03: ghi nhận một lần thu tiền; hóa đơn có thể trả nhiều lần.
CREATE FUNCTION ghi_thanh_toan(p_hoa_don uuid, p_so_tien integer, p_phuong_thuc text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_h    hoa_don%ROWTYPE;
  v_da   integer;
  v_id   uuid;
BEGIN
  PERFORM _yeu_cau_vai_tro('thu_ngan');
  IF p_so_tien IS NULL OR p_so_tien <= 0 THEN
    PERFORM _loi('SO_TIEN_KHONG_HOP_LE', 'Số tiền thu phải lớn hơn 0');
  END IF;
  IF p_phuong_thuc IS NULL OR p_phuong_thuc NOT IN ('tien_mat', 'chuyen_khoan') THEN
    PERFORM _loi('PHUONG_THUC_KHONG_HOP_LE', 'Phương thức thanh toán không hợp lệ');
  END IF;
  SELECT * INTO v_h FROM hoa_don WHERE id = p_hoa_don FOR UPDATE;
  IF NOT FOUND THEN
    PERFORM _loi('HOA_DON_KHONG_TON_TAI', 'Không tìm thấy hóa đơn');
  END IF;
  IF v_h.trang_thai NOT IN ('chua_thanh_toan', 'thanh_toan_mot_phan') THEN
    PERFORM _loi('HOA_DON_KHONG_HOP_LE', 'Hóa đơn đã thanh toán đủ hoặc đã hủy');
  END IF;

  SELECT coalesce(sum(so_tien), 0) INTO v_da FROM thanh_toan WHERE hoa_don_id = p_hoa_don;
  IF p_so_tien > v_h.tong_tien - v_da THEN
    PERFORM _loi('VUOT_SO_TIEN_CON_LAI',
                 format('Số tiền thu vượt quá số còn lại (%s đ)', v_h.tong_tien - v_da));
  END IF;

  INSERT INTO thanh_toan (hoa_don_id, thu_ngan_id, so_tien, phuong_thuc)
  VALUES (p_hoa_don, auth.uid(), p_so_tien, p_phuong_thuc) RETURNING id INTO v_id;

  UPDATE hoa_don
     SET trang_thai = CASE WHEN v_da + p_so_tien >= tong_tien THEN 'da_thanh_toan'
                           ELSE 'thanh_toan_mot_phan' END
   WHERE id = p_hoa_don;
  RETURN v_id;
END
$$;

-- TN05: doanh thu theo ngày (giờ Việt Nam), tính từ các lần thu tiền.
CREATE FUNCTION doanh_thu_theo_ngay(p_tu date, p_den date)
RETURNS TABLE (ngay date, so_giao_dich integer, tong_thu bigint, tien_mat bigint, chuyen_khoan bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  PERFORM _yeu_cau_vai_tro('thu_ngan');
  RETURN QUERY
  SELECT (t.thoi_gian AT TIME ZONE 'Asia/Ho_Chi_Minh')::date,
         count(*)::integer,
         coalesce(sum(t.so_tien), 0)::bigint,
         coalesce(sum(t.so_tien) FILTER (WHERE t.phuong_thuc = 'tien_mat'), 0)::bigint,
         coalesce(sum(t.so_tien) FILTER (WHERE t.phuong_thuc = 'chuyen_khoan'), 0)::bigint
    FROM thanh_toan t
   WHERE (t.thoi_gian AT TIME ZONE 'Asia/Ho_Chi_Minh')::date BETWEEN p_tu AND p_den
   GROUP BY 1
   ORDER BY 1;
END
$$;

-- ---------------------------------------------------------------------
-- G. TÀI KHOẢN VÀ KHÁCH HÀNG
-- ---------------------------------------------------------------------

-- Chủ nuôi đã đăng ký nhưng chưa có hồ sơ khách hàng thì tạo; đã có thì cập nhật.
CREATE FUNCTION hoan_tat_ho_so_chu_nuoi(p_ho_ten text, p_so_dien_thoai text, p_dia_chi text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_vt text;
  v_id uuid;
BEGIN
  v_vt := _yeu_cau_vai_tro('chu_nuoi');
  IF v_vt <> 'chu_nuoi' THEN
    PERFORM _loi('KHONG_CO_QUYEN', 'Chỉ tài khoản chủ vật nuôi mới có hồ sơ chủ nuôi');
  END IF;
  IF p_ho_ten IS NULL OR length(btrim(p_ho_ten)) = 0 THEN
    PERFORM _loi('THIEU_HO_TEN', 'Vui lòng nhập họ tên');
  END IF;
  IF p_so_dien_thoai IS NULL OR p_so_dien_thoai !~ '^(\+84|0)[0-9]{9}$' THEN
    PERFORM _loi('SO_DIEN_THOAI_KHONG_HOP_LE', 'Số điện thoại không hợp lệ (ví dụ 0901234567)');
  END IF;

  INSERT INTO chu_nuoi (tai_khoan_id, ho_ten, so_dien_thoai, dia_chi)
  VALUES (auth.uid(), btrim(p_ho_ten), p_so_dien_thoai, nullif(btrim(p_dia_chi), ''))
  ON CONFLICT (tai_khoan_id) DO UPDATE
     SET ho_ten = EXCLUDED.ho_ten,
         so_dien_thoai = EXCLUDED.so_dien_thoai,
         dia_chi = EXCLUDED.dia_chi
  RETURNING id INTO v_id;

  UPDATE tai_khoan SET ho_ten = btrim(p_ho_ten), so_dien_thoai = p_so_dien_thoai WHERE id = auth.uid();
  RETURN v_id;
END
$$;

-- LT06: khách từng đến trực tiếp (chưa có tài khoản) sau đó đăng ký tài khoản.
-- Lễ tân xác minh đúng người rồi gộp: thú cưng chuyển sang hồ sơ gắn tài khoản,
-- hồ sơ cũ bị xóa. Không tự gộp theo số điện thoại để tránh lộ dữ liệu cho người lạ.
CREATE FUNCTION gop_chu_nuoi(p_cu uuid, p_moi uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_cu  chu_nuoi%ROWTYPE;
  v_moi chu_nuoi%ROWTYPE;
BEGIN
  PERFORM _yeu_cau_vai_tro('le_tan');
  IF p_cu = p_moi THEN
    PERFORM _loi('HAI_HO_SO_TRUNG', 'Hai hồ sơ phải khác nhau');
  END IF;
  SELECT * INTO v_cu  FROM chu_nuoi WHERE id = p_cu  FOR UPDATE;
  IF NOT FOUND THEN PERFORM _loi('HO_SO_KHONG_TON_TAI', 'Không tìm thấy hồ sơ cần gộp'); END IF;
  SELECT * INTO v_moi FROM chu_nuoi WHERE id = p_moi FOR UPDATE;
  IF NOT FOUND THEN PERFORM _loi('HO_SO_KHONG_TON_TAI', 'Không tìm thấy hồ sơ đích'); END IF;
  IF v_cu.tai_khoan_id IS NOT NULL THEN
    PERFORM _loi('HO_SO_DA_CO_TAI_KHOAN', 'Hồ sơ cũ đã gắn với một tài khoản nên không thể gộp');
  END IF;
  IF v_moi.tai_khoan_id IS NULL THEN
    PERFORM _loi('HO_SO_CHUA_CO_TAI_KHOAN', 'Hồ sơ đích phải là hồ sơ đã gắn tài khoản');
  END IF;
  UPDATE thu_cung SET chu_nuoi_id = p_moi WHERE chu_nuoi_id = p_cu;
  DELETE FROM chu_nuoi WHERE id = p_cu;
END
$$;

-- AD02: gán hoặc đổi vai trò. Chỉ admin; không tự đổi vai trò của mình
-- (nên người gọi luôn còn là admin đang hoạt động, hệ thống không bao giờ hết admin).
CREATE FUNCTION dat_vai_tro(p_tai_khoan uuid, p_vai_tro text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_t tai_khoan%ROWTYPE;
BEGIN
  PERFORM _yeu_cau_vai_tro();
  IF p_vai_tro IS NULL OR p_vai_tro NOT IN ('admin','bac_si','le_tan','thu_ngan','kho','chu_nuoi') THEN
    PERFORM _loi('VAI_TRO_KHONG_HOP_LE', 'Vai trò không hợp lệ');
  END IF;
  IF p_tai_khoan = auth.uid() THEN
    PERFORM _loi('KHONG_TU_DOI_VAI_TRO', 'Không thể tự đổi vai trò của chính mình');
  END IF;
  SELECT * INTO v_t FROM tai_khoan WHERE id = p_tai_khoan FOR UPDATE;
  IF NOT FOUND THEN
    PERFORM _loi('TAI_KHOAN_KHONG_TON_TAI', 'Không tìm thấy tài khoản');
  END IF;
  IF v_t.vai_tro = p_vai_tro THEN
    PERFORM _loi('KHONG_THAY_DOI', 'Tài khoản đã có vai trò này');
  END IF;
  IF v_t.vai_tro = 'bac_si' AND EXISTS (
       SELECT 1 FROM lich_hen WHERE bac_si_id = p_tai_khoan
          AND trang_thai IN ('cho_xac_nhan','da_xac_nhan') AND thoi_gian > now()) THEN
    PERFORM _loi('BAC_SI_CON_LICH_HEN', 'Bác sĩ còn lịch hẹn chưa diễn ra, hãy đổi bác sĩ cho các lịch đó trước');
  END IF;

  UPDATE tai_khoan SET vai_tro = p_vai_tro WHERE id = p_tai_khoan;
  IF p_vai_tro = 'bac_si' THEN
    INSERT INTO ho_so_bac_si (tai_khoan_id) VALUES (p_tai_khoan) ON CONFLICT (tai_khoan_id) DO NOTHING;
  END IF;
  IF v_t.vai_tro = 'chu_nuoi' THEN
    DELETE FROM chu_nuoi c
     WHERE c.tai_khoan_id = p_tai_khoan
       AND NOT EXISTS (SELECT 1 FROM thu_cung t WHERE t.chu_nuoi_id = c.id);
  END IF;
END
$$;

-- AD01: khóa hoặc mở khóa tài khoản (thay cho xóa với tài khoản đã có hoạt động).
CREATE FUNCTION khoa_tai_khoan(p_tai_khoan uuid, p_khoa boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_t tai_khoan%ROWTYPE;
BEGIN
  PERFORM _yeu_cau_vai_tro();
  IF p_tai_khoan = auth.uid() THEN
    PERFORM _loi('KHONG_TU_KHOA', 'Không thể tự khóa tài khoản của chính mình');
  END IF;
  SELECT * INTO v_t FROM tai_khoan WHERE id = p_tai_khoan FOR UPDATE;
  IF NOT FOUND THEN
    PERFORM _loi('TAI_KHOAN_KHONG_TON_TAI', 'Không tìm thấy tài khoản');
  END IF;
  IF p_khoa THEN
    IF v_t.vai_tro = 'bac_si' AND EXISTS (
         SELECT 1 FROM lich_hen WHERE bac_si_id = p_tai_khoan
            AND trang_thai IN ('cho_xac_nhan','da_xac_nhan') AND thoi_gian > now()) THEN
      PERFORM _loi('BAC_SI_CON_LICH_HEN', 'Bác sĩ còn lịch hẹn chưa diễn ra, hãy đổi bác sĩ cho các lịch đó trước');
    END IF;
  END IF;
  UPDATE tai_khoan SET trang_thai = CASE WHEN p_khoa THEN 'khoa' ELSE 'hoat_dong' END WHERE id = p_tai_khoan;
END
$$;

-- AD01: xóa tài khoản. Chỉ xóa được tài khoản chưa phát sinh dữ liệu nào;
-- còn lại hệ thống từ chối và admin dùng khoa_tai_khoan.
CREATE FUNCTION xoa_tai_khoan(p_tai_khoan uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_t tai_khoan%ROWTYPE;
BEGIN
  PERFORM _yeu_cau_vai_tro();
  IF p_tai_khoan = auth.uid() THEN
    PERFORM _loi('KHONG_TU_XOA', 'Không thể tự xóa tài khoản của chính mình');
  END IF;
  SELECT * INTO v_t FROM tai_khoan WHERE id = p_tai_khoan FOR UPDATE;
  IF NOT FOUND THEN
    PERFORM _loi('TAI_KHOAN_KHONG_TON_TAI', 'Không tìm thấy tài khoản');
  END IF;
  BEGIN
    DELETE FROM auth.users WHERE id = p_tai_khoan;
  EXCEPTION WHEN foreign_key_violation THEN
    PERFORM _loi('TAI_KHOAN_DA_PHAT_SINH',
                 'Tài khoản đã có dữ liệu liên quan nên không thể xóa, hãy khóa tài khoản');
  END;
END
$$;

-- LT07: lễ tân ghi nhận đã nhắc khách (gọi điện, email...) cho một lịch hoặc một mũi tiêm.
CREATE FUNCTION ghi_nhan_nhac(p_lich uuid, p_mui_tiem uuid, p_kenh text,
                              p_trang_thai text DEFAULT 'da_gui')
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_id uuid;
BEGIN
  PERFORM _yeu_cau_vai_tro('le_tan');
  IF (p_lich IS NOT NULL)::integer + (p_mui_tiem IS NOT NULL)::integer <> 1 THEN
    PERFORM _loi('NHAC_KHONG_HOP_LE', 'Chỉ chọn một trong hai: lịch hẹn hoặc mũi tiêm');
  END IF;
  IF p_kenh IS NULL OR p_kenh NOT IN ('email','dien_thoai','khac') THEN
    PERFORM _loi('KENH_KHONG_HOP_LE', 'Kênh nhắc không hợp lệ');
  END IF;
  IF p_trang_thai IS NULL OR p_trang_thai NOT IN ('cho_gui','da_gui','that_bai') THEN
    PERFORM _loi('TRANG_THAI_KHONG_HOP_LE', 'Trạng thái nhắc không hợp lệ');
  END IF;
  IF p_lich IS NOT NULL AND NOT EXISTS (SELECT 1 FROM lich_hen WHERE id = p_lich) THEN
    PERFORM _loi('LICH_KHONG_TON_TAI', 'Không tìm thấy lịch hẹn');
  END IF;
  IF p_mui_tiem IS NOT NULL AND NOT EXISTS (SELECT 1 FROM mui_tiem WHERE id = p_mui_tiem) THEN
    PERFORM _loi('MUI_TIEM_KHONG_TON_TAI', 'Không tìm thấy mũi tiêm');
  END IF;
  INSERT INTO nhac_lich (lich_hen_id, mui_tiem_id, nguoi_thuc_hien_id, kenh, trang_thai)
  VALUES (p_lich, p_mui_tiem, auth.uid(), p_kenh, p_trang_thai) RETURNING id INTO v_id;
  RETURN v_id;
END
$$;

-- ---------------------------------------------------------------------
-- H. VIEW
-- Các view này chạy với quyền chủ sở hữu (bỏ qua RLS) nhưng tự lọc theo vai trò
-- hoặc chỉ lộ cột công khai, nên an toàn khi cấp quyền SELECT.
-- ---------------------------------------------------------------------

-- Trang công khai: danh sách bác sĩ (không lộ số điện thoại hay dữ liệu khác).
CREATE VIEW bac_si_cong_khai AS
SELECT k.id, k.ho_ten, h.chuyen_mon, h.gioi_thieu, h.anh_dai_dien,
       (SELECT coalesce(jsonb_agg(jsonb_build_object('thu', w.thu_trong_tuan, 'tu', to_char(w.gio_bat_dau,'HH24:MI'), 'den', to_char(w.gio_ket_thuc,'HH24:MI'))
                                  ORDER BY w.thu_trong_tuan, w.gio_bat_dau), '[]'::jsonb)
          FROM lich_lam_viec w WHERE w.bac_si_id = k.id) AS lich_lam_viec,
       (SELECT round(avg(d.so_sao), 1) FROM danh_gia d JOIN lich_hen l ON l.id = d.lich_hen_id
         WHERE l.bac_si_id = k.id AND d.hien_thi) AS diem_tb,
       (SELECT count(*)::int FROM danh_gia d JOIN lich_hen l ON l.id = d.lich_hen_id
         WHERE l.bac_si_id = k.id AND d.hien_thi) AS so_danh_gia
  FROM tai_khoan k
  JOIN ho_so_bac_si h ON h.tai_khoan_id = k.id
 WHERE k.vai_tro = 'bac_si' AND k.trang_thai = 'hoat_dong';

-- Đánh giá công khai: chỉ tên rút gọn (tên gọi + chữ cái đầu họ), không lộ số điện thoại hay thú cưng.
-- tong và diem_tb tính trên toàn bộ đánh giá đang hiện, kể cả khi truy vấn chỉ lấy vài dòng đầu.
CREATE VIEW danh_gia_cong_khai AS
SELECT d.id, l.bac_si_id, d.so_sao, d.nhan_xet,
       coalesce((regexp_match(btrim(c.ho_ten), '(\S+)$'))[1], 'Khách') || ' ' || upper(left(btrim(c.ho_ten), 1)) || '.' AS ten_hien_thi,
       d.created_at AS ngay,
       count(*) OVER () AS tong,
       round(avg(d.so_sao) OVER (), 1) AS diem_tb
  FROM danh_gia d
  JOIN lich_hen l ON l.id = d.lich_hen_id
  JOIN thu_cung t ON t.id = l.thu_cung_id
  JOIN chu_nuoi c ON c.id = t.chu_nuoi_id
 WHERE d.hien_thi;

-- Tồn kho theo lô = tổng các biến động của lô đó.
CREATE VIEW ton_kho_lo AS
SELECT l.id AS lo_thuoc_id, t.id AS thuoc_id, t.ten, t.loai, t.don_vi,
       l.so_lo, l.han_dung,
       coalesce(s.ton, 0)::integer AS ton,
       (l.han_dung < hom_nay()) AS het_han
  FROM lo_thuoc l
  JOIN thuoc t ON t.id = l.thuoc_id
  LEFT JOIN (SELECT lo_thuoc_id, sum(so_luong) AS ton
               FROM bien_dong_kho GROUP BY lo_thuoc_id) s ON s.lo_thuoc_id = l.id
 WHERE vai_tro_hieu_luc() IN ('admin','kho','bac_si','thu_ngan','le_tan');

-- Tồn kho theo thuốc: tách phần còn hạn (dùng được) và phần đã hết hạn.
CREATE VIEW ton_kho_thuoc AS
SELECT t.id AS thuoc_id, t.ten, t.loai, t.don_vi, t.nguong_canh_bao, t.dang_ap_dung,
       coalesce(sum(x.ton) FILTER (WHERE NOT x.het_han), 0)::integer AS ton_con_han,
       coalesce(sum(x.ton) FILTER (WHERE x.het_han), 0)::integer     AS ton_het_han
  FROM thuoc t
  LEFT JOIN ton_kho_lo x ON x.thuoc_id = t.id
 WHERE vai_tro_hieu_luc() IN ('admin','kho','bac_si','thu_ngan','le_tan')
 GROUP BY t.id;

-- KT04: cảnh báo sắp hết hàng, lô sắp hết hạn, lô đã hết hạn còn tồn.
CREATE VIEW canh_bao_kho AS
SELECT 'sap_het'::text AS loai_canh_bao, k.thuoc_id, k.ten,
       NULL::uuid AS lo_thuoc_id, NULL::text AS so_lo, NULL::date AS han_dung,
       k.ton_con_han AS ton
  FROM ton_kho_thuoc k
 WHERE k.dang_ap_dung AND k.ton_con_han <= k.nguong_canh_bao
   AND vai_tro_hieu_luc() IN ('admin','kho')
UNION ALL
SELECT CASE WHEN x.het_han THEN 'het_han' ELSE 'sap_het_han' END,
       x.thuoc_id, x.ten, x.lo_thuoc_id, x.so_lo, x.han_dung, x.ton
  FROM ton_kho_lo x
 WHERE x.ton > 0
   AND x.han_dung <= hom_nay() + cau_hinh_so('canh_bao_han_dung_ngay', 30)
   AND vai_tro_hieu_luc() IN ('admin','kho');

-- LT07: việc cần nhắc: lịch hẹn trong 2 ngày tới và mũi tiêm đến hạn trong 7 ngày tới.
CREATE VIEW lich_can_nhac AS
SELECT 'lich_hen'::text AS loai_nhac, l.id AS lich_hen_id, NULL::uuid AS mui_tiem_id,
       l.thoi_gian AS thoi_diem, t.ten AS ten_thu_cung, c.ho_ten AS ten_chu_nuoi,
       c.so_dien_thoai, d.ten AS ten_dich_vu
  FROM lich_hen l
  JOIN thu_cung t ON t.id = l.thu_cung_id
  JOIN chu_nuoi c ON c.id = t.chu_nuoi_id
  JOIN dich_vu d ON d.id = l.dich_vu_id
 WHERE l.trang_thai = 'da_xac_nhan'
   AND l.thoi_gian BETWEEN now() AND now() + interval '2 days'
   AND NOT EXISTS (SELECT 1 FROM nhac_lich n WHERE n.lich_hen_id = l.id AND n.trang_thai = 'da_gui')
   AND vai_tro_hieu_luc() IN ('admin','le_tan')
UNION ALL
SELECT 'mui_tiem', NULL::uuid, m.id,
       (m.ngay_tiem_tiep::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh'),
       t.ten, c.ho_ten, c.so_dien_thoai, th.ten
  FROM mui_tiem m
  JOIN thu_cung t ON t.id = m.thu_cung_id
  JOIN chu_nuoi c ON c.id = t.chu_nuoi_id
  JOIN thuoc th ON th.id = m.thuoc_id
 WHERE m.ngay_tiem_tiep BETWEEN hom_nay() AND hom_nay() + 7
   AND NOT EXISTS (SELECT 1 FROM nhac_lich n WHERE n.mui_tiem_id = m.id AND n.trang_thai = 'da_gui')
   AND NOT EXISTS (SELECT 1 FROM mui_tiem m2   -- đã tiêm mũi sau rồi thì không cần nhắc nữa
                    WHERE m2.thu_cung_id = m.thu_cung_id AND m2.thuoc_id = m.thuoc_id
                      AND m2.ngay_tiem > m.ngay_tiem)
   AND vai_tro_hieu_luc() IN ('admin','le_tan');

-- ---------------------------------------------------------------------
-- I. TRIGGER
-- ---------------------------------------------------------------------

-- Đăng ký mới: tạo tài khoản vai trò chủ vật nuôi (KHÔNG bao giờ lấy vai trò từ dữ liệu
-- client gửi lên). Nếu có số điện thoại hợp lệ trong metadata thì tạo luôn hồ sơ chủ nuôi.
CREATE FUNCTION xu_ly_nguoi_dung_moi() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_ten text;
  v_sdt text;
BEGIN
  v_ten := coalesce(nullif(btrim(NEW.raw_user_meta_data->>'ho_ten'), ''),
                    nullif(btrim(split_part(coalesce(NEW.email, ''), '@', 1)), ''),
                    'Người dùng');
  v_sdt := NEW.raw_user_meta_data->>'so_dien_thoai';
  IF v_sdt IS NULL OR v_sdt !~ '^(\+84|0)[0-9]{9}$' THEN
    v_sdt := NULL;
  END IF;
  INSERT INTO tai_khoan (id, ho_ten, so_dien_thoai, vai_tro) VALUES (NEW.id, v_ten, v_sdt, 'chu_nuoi');
  IF v_sdt IS NOT NULL THEN
    INSERT INTO chu_nuoi (tai_khoan_id, ho_ten, so_dien_thoai) VALUES (NEW.id, v_ten, v_sdt);
  END IF;
  RETURN NEW;
END
$$;
CREATE TRIGGER trg_nguoi_dung_moi AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION xu_ly_nguoi_dung_moi();

-- Nhật ký thao tác: ghi ai làm gì, lúc nào, giá trị cũ và mới (jsonb).
-- Do cơ sở dữ liệu tự ghi nên trình duyệt không thể ghi giả hoặc bỏ qua.
CREATE FUNCTION ghi_nhat_ky() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_cu  jsonb;
  v_moi jsonb;
  v_row jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_moi := to_jsonb(NEW); v_row := v_moi;
  ELSIF TG_OP = 'UPDATE' THEN
    v_cu := to_jsonb(OLD); v_moi := to_jsonb(NEW); v_row := v_moi;
    IF v_cu = v_moi THEN RETURN NULL; END IF;
  ELSE
    v_cu := to_jsonb(OLD); v_row := v_cu;
  END IF;
  INSERT INTO nhat_ky (tai_khoan_id, hanh_dong, bang_tac_dong, ban_ghi_id, gia_tri_cu, gia_tri_moi)
  VALUES (CASE WHEN EXISTS (SELECT 1 FROM tai_khoan WHERE id = auth.uid()) THEN auth.uid() END,
          CASE TG_OP WHEN 'INSERT' THEN 'them' WHEN 'UPDATE' THEN 'sua' ELSE 'xoa' END,
          TG_TABLE_NAME, (v_row->>'id')::uuid, v_cu, v_moi);
  RETURN NULL;
END
$$;

DO $$
DECLARE b text;
BEGIN
  FOREACH b IN ARRAY ARRAY['tai_khoan','chu_nuoi','ho_so_bac_si','lich_lam_viec','cau_hinh',
                           'thu_cung','dich_vu','thuoc','lo_thuoc','lich_hen','ho_so_kham',
                           'don_thuoc','ct_don_thuoc','mui_tiem','hoa_don','thanh_toan','danh_gia']
  LOOP
    EXECUTE format('CREATE TRIGGER trg_nhat_ky AFTER INSERT OR UPDATE OR DELETE ON %I
                    FOR EACH ROW EXECUTE FUNCTION ghi_nhat_ky()', b);
  END LOOP;
END
$$;

-- Bảng chỉ thêm: nhật ký, thanh toán. Không ai (kể cả admin) sửa hoặc xóa được.
CREATE FUNCTION chi_cho_them() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'BAN_GHI_BAT_BIEN: Bảng % chỉ cho phép thêm, không được sửa hoặc xóa', TG_TABLE_NAME
    USING ERRCODE = 'P0001', HINT = 'BAN_GHI_BAT_BIEN';
END
$$;
CREATE TRIGGER trg_bat_bien BEFORE UPDATE OR DELETE ON nhat_ky
  FOR EACH ROW EXECUTE FUNCTION chi_cho_them();
CREATE TRIGGER trg_bat_bien_cat BEFORE TRUNCATE ON nhat_ky
  FOR EACH STATEMENT EXECUTE FUNCTION chi_cho_them();
CREATE TRIGGER trg_bat_bien BEFORE UPDATE OR DELETE ON thanh_toan
  FOR EACH ROW EXECUTE FUNCTION chi_cho_them();
CREATE TRIGGER trg_bat_bien_cat BEFORE TRUNCATE ON thanh_toan
  FOR EACH STATEMENT EXECUTE FUNCTION chi_cho_them();

-- Sổ cái kho: chỉ thêm. Ngoại lệ duy nhất: khi một dòng đơn thuốc bị xóa lúc kê lại đơn,
-- khóa ngoại ON DELETE SET NULL được phép đặt ct_don_thuoc_id về NULL.
CREATE FUNCTION bao_ve_bien_dong_kho() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.ct_don_thuoc_id IS NULL
     AND (to_jsonb(NEW) - 'ct_don_thuoc_id') = (to_jsonb(OLD) - 'ct_don_thuoc_id') THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'BAN_GHI_BAT_BIEN: Sổ cái kho chỉ cho phép thêm, hãy ghi một dòng điều chỉnh'
    USING ERRCODE = 'P0001', HINT = 'BAN_GHI_BAT_BIEN';
END
$$;
CREATE TRIGGER trg_bat_bien BEFORE UPDATE OR DELETE ON bien_dong_kho
  FOR EACH ROW EXECUTE FUNCTION bao_ve_bien_dong_kho();
CREATE TRIGGER trg_bat_bien_cat BEFORE TRUNCATE ON bien_dong_kho
  FOR EACH STATEMENT EXECUTE FUNCTION chi_cho_them();

-- Hồ sơ bác sĩ và lịch làm việc chỉ gắn được cho tài khoản có vai trò bác sĩ.
-- Tham số trigger: tên cột chứa id tài khoản.
CREATE FUNCTION kiem_tra_la_bac_si() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_id uuid := (to_jsonb(NEW) ->> TG_ARGV[0])::uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM tai_khoan WHERE id = v_id AND vai_tro = 'bac_si') THEN
    PERFORM _loi('KHONG_PHAI_BAC_SI', 'Tài khoản này không có vai trò bác sĩ');
  END IF;
  RETURN NEW;
END
$$;
CREATE TRIGGER trg_la_bac_si BEFORE INSERT OR UPDATE ON ho_so_bac_si
  FOR EACH ROW EXECUTE FUNCTION kiem_tra_la_bac_si('tai_khoan_id');
CREATE TRIGGER trg_la_bac_si BEFORE INSERT OR UPDATE ON lich_lam_viec
  FOR EACH ROW EXECUTE FUNCTION kiem_tra_la_bac_si('bac_si_id');

-- ---------------------------------------------------------------------
-- I2. BÁO CÁO DOANH THU CHO ADMIN
-- doanh_thu_theo_ngay (thu ngân + admin) nằm ở mục F. Các báo cáo dưới đây chỉ admin.
-- "Thu" = tiền đã thu thực tế (thanh_toan). "Doanh số" = giá trị hóa đơn đã lập, chưa hủy.
-- ---------------------------------------------------------------------

CREATE FUNCTION doanh_thu_theo_thang(p_tu date, p_den date)
RETURNS TABLE (thang date, so_giao_dich integer, tong_thu bigint, tien_mat bigint, chuyen_khoan bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  PERFORM _yeu_cau_vai_tro();
  IF p_tu IS NULL OR p_den IS NULL OR p_tu > p_den THEN
    PERFORM _loi('KHOANG_NGAY_KHONG_HOP_LE', 'Khoảng ngày không hợp lệ');
  END IF;
  RETURN QUERY
  SELECT date_trunc('month', t.thoi_gian AT TIME ZONE 'Asia/Ho_Chi_Minh')::date,
         count(*)::integer,
         coalesce(sum(t.so_tien), 0)::bigint,
         coalesce(sum(t.so_tien) FILTER (WHERE t.phuong_thuc = 'tien_mat'), 0)::bigint,
         coalesce(sum(t.so_tien) FILTER (WHERE t.phuong_thuc = 'chuyen_khoan'), 0)::bigint
    FROM thanh_toan t
   WHERE (t.thoi_gian AT TIME ZONE 'Asia/Ho_Chi_Minh')::date BETWEEN p_tu AND p_den
   GROUP BY 1
   ORDER BY 1;
END
$$;

-- Doanh số theo nhóm (Dịch vụ / Thuốc / Vaccine) và theo tên mục, tính từ dòng hóa đơn.
CREATE FUNCTION doanh_thu_theo_dich_vu(p_tu date, p_den date)
RETURNS TABLE (nhom text, ten text, so_luong bigint, tong_tien bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  PERFORM _yeu_cau_vai_tro();
  IF p_tu IS NULL OR p_den IS NULL OR p_tu > p_den THEN
    PERFORM _loi('KHOANG_NGAY_KHONG_HOP_LE', 'Khoảng ngày không hợp lệ');
  END IF;
  RETURN QUERY
  SELECT split_part(c.mo_ta, ': ', 1),
         substring(c.mo_ta FROM position(': ' IN c.mo_ta) + 2),
         sum(c.so_luong)::bigint,
         sum(c.thanh_tien)::bigint
    FROM ct_hoa_don c
    JOIN hoa_don h ON h.id = c.hoa_don_id
   WHERE h.trang_thai <> 'da_huy'
     AND (h.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date BETWEEN p_tu AND p_den
   GROUP BY 1, 2
   ORDER BY 4 DESC, 2;
END
$$;

-- Công nợ: hóa đơn chưa thu đủ, kèm người liên hệ.
CREATE VIEW cong_no_hoa_don AS
SELECT h.id AS hoa_don_id, h.lich_hen_id, h.created_at, c.ho_ten AS ten_chu_nuoi, c.so_dien_thoai,
       h.tong_tien,
       coalesce(sum(p.so_tien), 0)::integer AS da_thu,
       (h.tong_tien - coalesce(sum(p.so_tien), 0))::integer AS con_no
  FROM hoa_don h
  JOIN lich_hen l ON l.id = h.lich_hen_id
  JOIN thu_cung t ON t.id = l.thu_cung_id
  JOIN chu_nuoi c ON c.id = t.chu_nuoi_id
  LEFT JOIN thanh_toan p ON p.hoa_don_id = h.id
 WHERE h.trang_thai IN ('chua_thanh_toan', 'thanh_toan_mot_phan')
   AND vai_tro_hieu_luc() = 'admin'
 GROUP BY h.id, c.id;

-- ---------------------------------------------------------------------
-- I3. TRAO ĐỔI NỘI BỘ (nhân viên <-> admin, chỉ văn bản)
-- ---------------------------------------------------------------------

-- Gửi tin. Nhân viên chỉ gửi vào luồng của chính mình; admin gửi vào luồng của bất kỳ nhân viên.
-- Giới hạn 20 tin mỗi phút mỗi người gửi để chống spam.
CREATE FUNCTION gui_tin_nhan(p_nhan_vien uuid, p_noi_dung text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_vt  text;
  v_nd  text := btrim(coalesce(p_noi_dung, ''));
  v_id  uuid;
BEGIN
  v_vt := _yeu_cau_vai_tro('bac_si', 'le_tan', 'thu_ngan', 'kho');
  IF v_vt <> 'admin' THEN
    IF p_nhan_vien IS DISTINCT FROM auth.uid() THEN
      PERFORM _loi('KHONG_CO_QUYEN', 'Bạn chỉ trò chuyện được trong luồng của chính mình');
    END IF;
  ELSIF NOT EXISTS (SELECT 1 FROM tai_khoan WHERE id = p_nhan_vien
                     AND vai_tro IN ('bac_si', 'le_tan', 'thu_ngan', 'kho')) THEN
    PERFORM _loi('LUONG_KHONG_HOP_LE', 'Người nhận phải là tài khoản nhân viên');
  END IF;
  IF length(v_nd) = 0 OR length(v_nd) > 1000 THEN
    PERFORM _loi('NOI_DUNG_KHONG_HOP_LE', 'Tin nhắn phải từ 1 đến 1000 ký tự');
  END IF;
  IF (SELECT count(*) FROM tin_nhan WHERE nguoi_gui_id = auth.uid()
       AND created_at > now() - interval '1 minute') >= 20 THEN
    PERFORM _loi('QUA_NHIEU_TIN_NHAN', 'Bạn gửi quá nhanh, vui lòng chờ một lát');
  END IF;

  INSERT INTO tin_nhan (nhan_vien_id, nguoi_gui_id, noi_dung)
  VALUES (p_nhan_vien, auth.uid(), v_nd) RETURNING id INTO v_id;

  INSERT INTO doc_tin_nhan (nhan_vien_id, tai_khoan_id, doc_den)
  VALUES (p_nhan_vien, auth.uid(), now())
  ON CONFLICT (nhan_vien_id, tai_khoan_id) DO UPDATE SET doc_den = EXCLUDED.doc_den;
  RETURN v_id;
END
$$;

-- Đánh dấu đã đọc toàn bộ luồng tới thời điểm hiện tại.
CREATE FUNCTION danh_dau_da_doc(p_nhan_vien uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_vt text;
BEGIN
  v_vt := _yeu_cau_vai_tro('bac_si', 'le_tan', 'thu_ngan', 'kho');
  IF v_vt <> 'admin' AND p_nhan_vien IS DISTINCT FROM auth.uid() THEN
    PERFORM _loi('KHONG_CO_QUYEN', 'Bạn chỉ đọc được luồng của chính mình');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM tai_khoan WHERE id = p_nhan_vien
                  AND vai_tro IN ('bac_si', 'le_tan', 'thu_ngan', 'kho')) THEN
    PERFORM _loi('LUONG_KHONG_HOP_LE', 'Luồng không tồn tại');
  END IF;
  INSERT INTO doc_tin_nhan (nhan_vien_id, tai_khoan_id, doc_den)
  VALUES (p_nhan_vien, auth.uid(), now())
  ON CONFLICT (nhan_vien_id, tai_khoan_id) DO UPDATE SET doc_den = EXCLUDED.doc_den;
END
$$;

-- Hộp thư: mỗi luồng một dòng, kèm tin cuối và số tin chưa đọc của người đang đăng nhập.
-- Admin thấy mọi luồng (kể cả luồng chưa có tin để bắt đầu trò chuyện); nhân viên chỉ thấy luồng của mình.
CREATE VIEW hop_thu_noi_bo AS
SELECT t.id AS nhan_vien_id, t.ho_ten, t.vai_tro,
       l.noi_dung AS tin_cuoi, l.created_at AS thoi_diem_cuoi,
       (SELECT count(*) FROM tin_nhan m
         WHERE m.nhan_vien_id = t.id AND m.nguoi_gui_id <> auth.uid()
           AND m.created_at > coalesce((SELECT d.doc_den FROM doc_tin_nhan d
                                         WHERE d.nhan_vien_id = t.id AND d.tai_khoan_id = auth.uid()),
                                       '-infinity'))::integer AS chua_doc
  FROM tai_khoan t
  LEFT JOIN LATERAL (SELECT m.noi_dung, m.created_at FROM tin_nhan m
                      WHERE m.nhan_vien_id = t.id ORDER BY m.created_at DESC LIMIT 1) l ON true
 WHERE t.vai_tro IN ('bac_si', 'le_tan', 'thu_ngan', 'kho')
   AND (vai_tro_hieu_luc() = 'admin'
        OR (vai_tro_hieu_luc() IN ('bac_si', 'le_tan', 'thu_ngan', 'kho') AND t.id = auth.uid()));

-- Tin nhắn chỉ thêm, không sửa/xóa.
CREATE TRIGGER trg_bat_bien BEFORE UPDATE OR DELETE ON tin_nhan
  FOR EACH ROW EXECUTE FUNCTION chi_cho_them();
CREATE TRIGGER trg_bat_bien_cat BEFORE TRUNCATE ON tin_nhan
  FOR EACH STATEMENT EXECUTE FUNCTION chi_cho_them();

-- Supabase Realtime: cho trình duyệt nhận tin mới tức thời (vẫn chịu chính sách RLS).
-- Trên PostgreSQL thường (không có publication này) thì bỏ qua.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE tin_nhan;
  END IF;
END
$$;

-- ---------------------------------------------------------------------
-- J. PHÂN QUYỀN THỰC THI HÀM
-- Mặc định thu hồi hết, chỉ cấp lại đúng những hàm được phép gọi.
-- ---------------------------------------------------------------------
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon, authenticated;

-- Hàm dùng trong chính sách RLS (cần cho cả khách chưa đăng nhập đối với hàm đầu tiên).
GRANT EXECUTE ON FUNCTION vai_tro_hieu_luc() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION la_chu_nuoi_cua(uuid), la_chu_thu_cung(uuid), la_chu_lich_hen(uuid),
                          la_chu_ho_so_kham(uuid), la_chu_don_thuoc(uuid), la_chu_hoa_don(uuid)
  TO authenticated;
-- Hàm cấu hình và giờ dùng trong view/chính sách.
GRANT EXECUTE ON FUNCTION hom_nay(), cau_hinh_so(text, integer) TO anon, authenticated;

-- Hàm nghiệp vụ gọi qua supabase.rpc (mỗi hàm tự kiểm tra vai trò bên trong).
GRANT EXECUTE ON FUNCTION
  khung_gio_trong(uuid, date),
  dat_lich(uuid, uuid, uuid, timestamptz, uuid, text),
  doi_lich(uuid, timestamptz, uuid),
  huy_lich(uuid, text),
  xac_nhan_lich(uuid),
  danh_dau_khong_den(uuid),
  ghi_ho_so_kham(uuid, text, numeric, numeric, text),
  ke_don(uuid, jsonb),
  ghi_tiem(uuid, date, uuid),
  xem_ho_so_kham(uuid),
  nhap_kho(uuid, text, date, integer),
  dieu_chinh_kho(uuid, integer, text),
  lap_hoa_don(uuid),
  huy_hoa_don(uuid),
  ghi_thanh_toan(uuid, integer, text),
  doanh_thu_theo_ngay(date, date),
  hoan_tat_ho_so_chu_nuoi(text, text, text),
  gop_chu_nuoi(uuid, uuid),
  dat_vai_tro(uuid, text),
  khoa_tai_khoan(uuid, boolean),
  xoa_tai_khoan(uuid),
  ghi_nhan_nhac(uuid, uuid, text, text),
  doanh_thu_theo_thang(date, date),
  doanh_thu_theo_dich_vu(date, date),
  gui_tin_nhan(uuid, text),
  danh_dau_da_doc(uuid),
  gui_danh_gia(uuid, integer, text),
  an_hien_danh_gia(uuid, boolean)
  TO authenticated;
