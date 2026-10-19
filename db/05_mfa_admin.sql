-- =====================================================================
-- 05_mfa_admin.sql: bắt buộc nhập mã xác thực hai lớp với admin đã đăng ký TOTP.
-- Dành cho cơ sở dữ liệu ĐÃ cài từ trước (bản cài mới đã có sẵn trong 02_logic.sql).
-- Có thể chạy lại nhiều lần. Admin chưa đăng ký TOTP không bị ảnh hưởng.
--
-- Nếu admin mất thiết bị xác thực, gỡ yếu tố bằng SQL Editor (cần quyền chủ dự án):
--   delete from auth.mfa_factors where user_id = (select id from auth.users where email = 'email-admin');
-- =====================================================================
CREATE OR REPLACE FUNCTION vai_tro_hien_tai() RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT t.vai_tro FROM tai_khoan t
   WHERE t.id = auth.uid() AND t.trang_thai = 'hoat_dong'
     AND NOT (t.vai_tro = 'admin'
              AND coalesce(auth.jwt() ->> 'aal', 'aal1') <> 'aal2'
              AND EXISTS (SELECT 1 FROM auth.mfa_factors f
                           WHERE f.user_id = t.id AND f.status = 'verified'))
$$;
