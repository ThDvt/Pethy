-- =====================================================================
-- 07_danh_gia.sql: tính năng đánh giá của chủ nuôi (bảng, hàm, quyền, view công khai).
-- Dành cho cơ sở dữ liệu ĐÃ cài từ trước (bản cài mới đã có sẵn trong 01, 02, 03).
-- Cần chạy 06_mo_ta_dich_vu_va_lich_bac_si.sql trước. Chạy lại nhiều lần được.
-- Chạy trong Supabase: SQL Editor, dán toàn bộ nội dung rồi Run.
-- =====================================================================
CREATE TABLE IF NOT EXISTS danh_gia (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lich_hen_id  uuid NOT NULL UNIQUE REFERENCES lich_hen(id) ON DELETE CASCADE,
  so_sao       smallint NOT NULL CHECK (so_sao BETWEEN 1 AND 5),
  nhan_xet     text CHECK (nhan_xet IS NULL OR length(nhan_xet) <= 500),
  hien_thi     boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE danh_gia ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON danh_gia FROM anon, authenticated;

DROP POLICY IF EXISTS danh_gia_doc ON danh_gia;
CREATE POLICY danh_gia_doc ON danh_gia FOR SELECT TO authenticated
  USING ((vai_tro_hieu_luc() = 'chu_nuoi' AND la_chu_lich_hen(lich_hen_id))
         OR vai_tro_hieu_luc() = 'admin');

DROP TRIGGER IF EXISTS trg_nhat_ky ON danh_gia;
CREATE TRIGGER trg_nhat_ky AFTER INSERT OR UPDATE OR DELETE ON danh_gia
  FOR EACH ROW EXECUTE FUNCTION ghi_nhat_ky();

-- Chủ nuôi đánh giá lần khám đã hoàn thành (gửi mới hoặc sửa đánh giá của chính mình).
CREATE OR REPLACE FUNCTION gui_danh_gia(p_lich uuid, p_so_sao integer, p_nhan_xet text DEFAULT NULL) RETURNS void
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
CREATE OR REPLACE FUNCTION an_hien_danh_gia(p_id uuid, p_hien boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  PERFORM _yeu_cau_vai_tro('admin');
  UPDATE danh_gia SET hien_thi = coalesce(p_hien, true) WHERE id = p_id;
  IF NOT FOUND THEN PERFORM _loi('DANH_GIA_KHONG_TON_TAI', 'Không tìm thấy đánh giá'); END IF;
END
$$;


CREATE OR REPLACE VIEW bac_si_cong_khai AS
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
CREATE OR REPLACE VIEW danh_gia_cong_khai AS
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

GRANT SELECT ON danh_gia TO authenticated;
GRANT SELECT ON bac_si_cong_khai, danh_gia_cong_khai TO anon, authenticated;
REVOKE EXECUTE ON FUNCTION gui_danh_gia(uuid, integer, text), an_hien_danh_gia(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION gui_danh_gia(uuid, integer, text), an_hien_danh_gia(uuid, boolean) TO authenticated;
