-- =====================================================================
-- HỆ THỐNG QUẢN LÝ PHÒNG KHÁM THÚ Y — 04_storage.sql
-- Lưu ảnh đại diện bác sĩ trong Supabase Storage.
--
-- Quy ước đường dẫn:  <tai_khoan_id của bác sĩ>/<tên file>   ví dụ  3f2a.../avatar.webp
-- Sau khi tải ảnh lên, lưu đường dẫn đó vào ho_so_bac_si.anh_dai_dien.
-- Bucket công khai (ảnh bác sĩ hiển thị trên trang chủ); chỉ admin hoặc chính bác sĩ
-- được tải lên, thay, xóa ảnh trong thư mục của mình. Giới hạn 2 MB, chỉ JPEG/PNG/WebP.
-- Có thể chạy lại nhiều lần.
-- =====================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatar-bac-si', 'avatar-bac-si', true, 2097152,
        ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE
   SET public = EXCLUDED.public,
       file_size_limit = EXCLUDED.file_size_limit,
       allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS avatar_bac_si_doc  ON storage.objects;
DROP POLICY IF EXISTS avatar_bac_si_them ON storage.objects;
DROP POLICY IF EXISTS avatar_bac_si_sua  ON storage.objects;
DROP POLICY IF EXISTS avatar_bac_si_xoa  ON storage.objects;

CREATE POLICY avatar_bac_si_doc ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'avatar-bac-si');

CREATE POLICY avatar_bac_si_them ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatar-bac-si'
              AND (public.vai_tro_hieu_luc() = 'admin'
                   OR (public.vai_tro_hieu_luc() = 'bac_si'
                       AND (storage.foldername(name))[1] = auth.uid()::text)));

CREATE POLICY avatar_bac_si_sua ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatar-bac-si'
         AND (public.vai_tro_hieu_luc() = 'admin'
              OR (public.vai_tro_hieu_luc() = 'bac_si'
                  AND (storage.foldername(name))[1] = auth.uid()::text)))
  WITH CHECK (bucket_id = 'avatar-bac-si'
              AND (public.vai_tro_hieu_luc() = 'admin'
                   OR (public.vai_tro_hieu_luc() = 'bac_si'
                       AND (storage.foldername(name))[1] = auth.uid()::text)));

CREATE POLICY avatar_bac_si_xoa ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatar-bac-si'
         AND (public.vai_tro_hieu_luc() = 'admin'
              OR (public.vai_tro_hieu_luc() = 'bac_si'
                  AND (storage.foldername(name))[1] = auth.uid()::text)));

-- Ảnh bìa bài viết: kho ảnh công khai (ảnh hiện cho cả khách), chỉ admin tải lên, thay, xóa. Tối đa 3 MB, JPEG/PNG/WebP.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('anh-bai-viet', 'anh-bai-viet', true, 3145728, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE
   SET public = EXCLUDED.public, file_size_limit = EXCLUDED.file_size_limit, allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS anh_bai_viet_doc  ON storage.objects;
DROP POLICY IF EXISTS anh_bai_viet_them ON storage.objects;
DROP POLICY IF EXISTS anh_bai_viet_sua  ON storage.objects;
DROP POLICY IF EXISTS anh_bai_viet_xoa  ON storage.objects;
CREATE POLICY anh_bai_viet_doc ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'anh-bai-viet');
CREATE POLICY anh_bai_viet_them ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'anh-bai-viet' AND public.vai_tro_hieu_luc() = 'admin');
CREATE POLICY anh_bai_viet_sua ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'anh-bai-viet' AND public.vai_tro_hieu_luc() = 'admin')
  WITH CHECK (bucket_id = 'anh-bai-viet' AND public.vai_tro_hieu_luc() = 'admin');
CREATE POLICY anh_bai_viet_xoa ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'anh-bai-viet' AND public.vai_tro_hieu_luc() = 'admin');
