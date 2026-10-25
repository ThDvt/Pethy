-- =====================================================================
-- 08_email_tai_khoan.sql: cho admin xem email của các tài khoản (trang Tài khoản).
-- Dành cho cơ sở dữ liệu ĐÃ cài từ trước (bản cài mới đã có sẵn trong 02). Chạy lại nhiều lần được.
-- Chạy trong Supabase: SQL Editor, dán toàn bộ nội dung rồi Run.
-- =====================================================================
DROP FUNCTION IF EXISTS danh_sach_tai_khoan();
-- Danh sách tài khoản kèm email (email nằm ở auth.users nên trình duyệt không đọc trực tiếp được). Chỉ admin.
CREATE FUNCTION danh_sach_tai_khoan() RETURNS TABLE (id uuid, ho_ten text, so_dien_thoai text, vai_tro text, trang_thai text, created_at timestamptz, email text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  PERFORM _yeu_cau_vai_tro('admin');
  RETURN QUERY
    SELECT k.id, k.ho_ten, k.so_dien_thoai, k.vai_tro, k.trang_thai, k.created_at, u.email::text
      FROM tai_khoan k LEFT JOIN auth.users u ON u.id = k.id
     ORDER BY k.created_at;
END
$$;

REVOKE EXECUTE ON FUNCTION danh_sach_tai_khoan() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION danh_sach_tai_khoan() TO authenticated;
