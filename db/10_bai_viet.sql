-- =====================================================================
-- 10_bai_viet.sql: tin tức thú cưng và thú y (bài viết do admin quản lý).
-- Dành cho cơ sở dữ liệu ĐÃ cài từ trước (bản cài mới đã có sẵn trong 01/02/03). Chạy lại nhiều lần được.
-- Chạy trong Supabase: SQL Editor, dán toàn bộ nội dung rồi Run.
-- =====================================================================
-- Bài viết tin tức thú cưng và thú y. Chỉ admin viết; khách chỉ thấy bài đã đăng.
CREATE TABLE IF NOT EXISTS bai_viet (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tieu_de     text NOT NULL CHECK (length(btrim(tieu_de)) BETWEEN 1 AND 150),
  nhom        text NOT NULL DEFAULT 'cham_soc' CHECK (nhom IN ('cham_soc','tiem_phong','benh','phong_kham')),
  tom_tat     text CHECK (tom_tat IS NULL OR length(tom_tat) <= 300),
  noi_dung    text NOT NULL CHECK (length(btrim(noi_dung)) BETWEEN 1 AND 10000),
  tac_gia     text CHECK (tac_gia IS NULL OR length(tac_gia) <= 80),
  trang_thai  text NOT NULL DEFAULT 'nhap' CHECK (trang_thai IN ('nhap','da_dang')),
  ngay_dang   timestamptz,                       -- tự đặt lần đầu đăng (trigger), client không ghi được
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_bai_viet_dang ON bai_viet (ngay_dang DESC) WHERE trang_thai = 'da_dang';

ALTER TABLE bai_viet ENABLE ROW LEVEL SECURITY;

-- Bài viết: tự đặt ngày đăng lần đầu và ngày sửa. Client không ghi được hai cột này.
CREATE OR REPLACE FUNCTION dat_ngay_bai_viet() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  NEW.updated_at := now();
  IF TG_OP = 'INSERT' THEN NEW.ngay_dang := NULL; ELSE NEW.ngay_dang := OLD.ngay_dang; END IF;
  IF NEW.trang_thai = 'da_dang' AND NEW.ngay_dang IS NULL THEN NEW.ngay_dang := now(); END IF;
  RETURN NEW;
END
$$;
DROP TRIGGER IF EXISTS trg_ngay_bai_viet ON bai_viet;
CREATE TRIGGER trg_ngay_bai_viet BEFORE INSERT OR UPDATE ON bai_viet
  FOR EACH ROW EXECUTE FUNCTION dat_ngay_bai_viet();
REVOKE EXECUTE ON FUNCTION dat_ngay_bai_viet() FROM PUBLIC, anon, authenticated;

GRANT SELECT ON bai_viet TO anon;
GRANT SELECT, DELETE ON bai_viet TO authenticated;
GRANT INSERT (tieu_de, nhom, tom_tat, noi_dung, tac_gia, trang_thai),
      UPDATE (tieu_de, nhom, tom_tat, noi_dung, tac_gia, trang_thai)
  ON bai_viet TO authenticated;

DROP POLICY IF EXISTS bai_viet_khach ON bai_viet;
DROP POLICY IF EXISTS bai_viet_doc ON bai_viet;
DROP POLICY IF EXISTS bai_viet_them ON bai_viet;
DROP POLICY IF EXISTS bai_viet_sua ON bai_viet;
DROP POLICY IF EXISTS bai_viet_xoa ON bai_viet;
-- bai_viet: khách và người dùng thường chỉ thấy bài đã đăng; admin thấy và quản lý tất cả.
CREATE POLICY bai_viet_khach ON bai_viet FOR SELECT TO anon USING (trang_thai = 'da_dang');
CREATE POLICY bai_viet_doc ON bai_viet FOR SELECT TO authenticated
  USING (trang_thai = 'da_dang' OR vai_tro_hieu_luc() = 'admin');
CREATE POLICY bai_viet_them ON bai_viet FOR INSERT TO authenticated WITH CHECK (vai_tro_hieu_luc() = 'admin');
CREATE POLICY bai_viet_sua ON bai_viet FOR UPDATE TO authenticated
  USING (vai_tro_hieu_luc() = 'admin') WITH CHECK (vai_tro_hieu_luc() = 'admin');
CREATE POLICY bai_viet_xoa ON bai_viet FOR DELETE TO authenticated USING (vai_tro_hieu_luc() = 'admin');

DROP TRIGGER IF EXISTS trg_nhat_ky ON bai_viet;
CREATE TRIGGER trg_nhat_ky AFTER INSERT OR UPDATE OR DELETE ON bai_viet
  FOR EACH ROW EXECUTE FUNCTION ghi_nhat_ky();
