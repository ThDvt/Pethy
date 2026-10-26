-- =====================================================================
-- 09_chung_chi_bac_si.sql: trình độ và chứng chỉ của bác sĩ (hiển thị công khai, chỉ admin nhập).
-- Dành cho cơ sở dữ liệu ĐÃ cài từ trước (bản cài mới đã có sẵn trong 01/02/03). Chạy lại nhiều lần được.
-- Chạy trong Supabase: SQL Editor, dán toàn bộ nội dung rồi Run.
-- =====================================================================
ALTER TABLE ho_so_bac_si
  ADD COLUMN IF NOT EXISTS trinh_do text CHECK (trinh_do IS NULL OR length(trinh_do) <= 160),
  ADD COLUMN IF NOT EXISTS nam_hanh_nghe smallint CHECK (nam_hanh_nghe IS NULL OR nam_hanh_nghe BETWEEN 1970 AND 2100),
  ADD COLUMN IF NOT EXISTS so_chung_chi text CHECK (so_chung_chi IS NULL OR length(so_chung_chi) <= 40),
  ADD COLUMN IF NOT EXISTS chung_chi text CHECK (chung_chi IS NULL OR length(chung_chi) <= 600);

GRANT INSERT (trinh_do, nam_hanh_nghe, so_chung_chi, chung_chi),
      UPDATE (trinh_do, nam_hanh_nghe, so_chung_chi, chung_chi)
  ON ho_so_bac_si TO authenticated;

DROP TRIGGER IF EXISTS trg_chung_chi ON ho_so_bac_si;
DROP FUNCTION IF EXISTS chi_admin_sua_chung_chi();
-- Trình độ và chứng chỉ hiển thị công khai nên chỉ quản trị viên được nhập (sau khi đối chiếu giấy tờ).
-- Bác sĩ vẫn tự sửa được chuyên môn, giới thiệu và ảnh. Thao tác từ SQL Editor (không có người dùng) không bị chặn.
CREATE FUNCTION chi_admin_sua_chung_chi() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND vai_tro_hien_tai() IS DISTINCT FROM 'admin' THEN
    IF (TG_OP = 'INSERT' AND (NEW.trinh_do, NEW.nam_hanh_nghe, NEW.so_chung_chi, NEW.chung_chi) IS DISTINCT FROM (NULL::text, NULL::smallint, NULL::text, NULL::text))
       OR (TG_OP = 'UPDATE' AND (NEW.trinh_do, NEW.nam_hanh_nghe, NEW.so_chung_chi, NEW.chung_chi)
                                IS DISTINCT FROM (OLD.trinh_do, OLD.nam_hanh_nghe, OLD.so_chung_chi, OLD.chung_chi)) THEN
      PERFORM _loi('CHI_ADMIN_SUA_CHUNG_CHI', 'Chỉ quản trị viên được cập nhật trình độ và chứng chỉ');
    END IF;
  END IF;
  RETURN NEW;
END
$$;
CREATE TRIGGER trg_chung_chi BEFORE INSERT OR UPDATE ON ho_so_bac_si
  FOR EACH ROW EXECUTE FUNCTION chi_admin_sua_chung_chi();
REVOKE EXECUTE ON FUNCTION chi_admin_sua_chung_chi() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE VIEW bac_si_cong_khai AS
SELECT k.id, k.ho_ten, h.chuyen_mon, h.gioi_thieu, h.anh_dai_dien,
       (SELECT coalesce(jsonb_agg(jsonb_build_object('thu', w.thu_trong_tuan, 'tu', to_char(w.gio_bat_dau,'HH24:MI'), 'den', to_char(w.gio_ket_thuc,'HH24:MI'))
                                  ORDER BY w.thu_trong_tuan, w.gio_bat_dau), '[]'::jsonb)
          FROM lich_lam_viec w WHERE w.bac_si_id = k.id) AS lich_lam_viec,
       (SELECT round(avg(d.so_sao), 1) FROM danh_gia d JOIN lich_hen l ON l.id = d.lich_hen_id
         WHERE l.bac_si_id = k.id AND d.hien_thi) AS diem_tb,
       (SELECT count(*)::int FROM danh_gia d JOIN lich_hen l ON l.id = d.lich_hen_id
         WHERE l.bac_si_id = k.id AND d.hien_thi) AS so_danh_gia,
       h.trinh_do, h.nam_hanh_nghe, h.so_chung_chi, h.chung_chi
  FROM tai_khoan k
  JOIN ho_so_bac_si h ON h.tai_khoan_id = k.id
 WHERE k.vai_tro = 'bac_si' AND k.trang_thai = 'hoat_dong';
GRANT SELECT ON bac_si_cong_khai TO anon, authenticated;
