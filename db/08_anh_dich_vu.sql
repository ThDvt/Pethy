-- =====================================================================
-- 08_anh_dich_vu.sql: ảnh minh họa cho dịch vụ (quản trị viên tự tải lên).
-- Dành cho cơ sở dữ liệu ĐÃ cài từ trước (bản cài mới đã có sẵn trong 01, 03, 04). Chạy lại nhiều lần được.
-- Chạy trong Supabase: SQL Editor, dán toàn bộ nội dung rồi Run.
-- =====================================================================
ALTER TABLE dich_vu ADD COLUMN IF NOT EXISTS anh text;
ALTER TABLE dich_vu DROP CONSTRAINT IF EXISTS dich_vu_anh_check;
ALTER TABLE dich_vu ADD CONSTRAINT dich_vu_anh_check
  CHECK (anh IS NULL OR (length(anh) <= 200 AND anh ~ '^[A-Za-z0-9/_.-]+$'));

GRANT INSERT (anh), UPDATE (anh) ON dich_vu TO authenticated;

-- ---------------------------------------------------------------------
-- Ảnh minh họa dịch vụ (bucket công khai, chỉ admin được tải lên, thay, xóa)
-- Quy ước đường dẫn:  <id dịch vụ>/<tên file>.webp   (lưu vào dich_vu.anh)
-- Giới hạn 2 MB, chỉ JPEG/PNG/WebP.
-- ---------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('anh-dich-vu', 'anh-dich-vu', true, 2097152,
        ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE
   SET public = EXCLUDED.public,
       file_size_limit = EXCLUDED.file_size_limit,
       allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS anh_dich_vu_doc  ON storage.objects;
DROP POLICY IF EXISTS anh_dich_vu_them ON storage.objects;
DROP POLICY IF EXISTS anh_dich_vu_sua  ON storage.objects;
DROP POLICY IF EXISTS anh_dich_vu_xoa  ON storage.objects;

CREATE POLICY anh_dich_vu_doc ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'anh-dich-vu');
CREATE POLICY anh_dich_vu_them ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'anh-dich-vu' AND public.vai_tro_hieu_luc() = 'admin');
CREATE POLICY anh_dich_vu_sua ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'anh-dich-vu' AND public.vai_tro_hieu_luc() = 'admin')
  WITH CHECK (bucket_id = 'anh-dich-vu' AND public.vai_tro_hieu_luc() = 'admin');
CREATE POLICY anh_dich_vu_xoa ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'anh-dich-vu' AND public.vai_tro_hieu_luc() = 'admin');
