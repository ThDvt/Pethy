-- =====================================================================
-- 13_chuyen_khoan_qr.sql: thông tin tài khoản nhận chuyển khoản để hiện mã VietQR trên hóa đơn.
-- Dành cho cơ sở dữ liệu ĐÃ cài từ trước (bản cài mới đã có sẵn trong 01 và 02). Chạy lại nhiều lần được.
-- Sau khi chạy: đăng nhập admin, vào Tham số, nhập ck_ma_ngan_hang, ck_so_tai_khoan, ck_ten_tai_khoan.
-- Chạy trong Supabase: SQL Editor, dán toàn bộ nội dung rồi Run.
-- =====================================================================
INSERT INTO cau_hinh (khoa, gia_tri, mo_ta, cong_khai) VALUES
  ('ck_ma_ngan_hang',        '',      'Mã BIN 6 số của ngân hàng nhận chuyển khoản (ví dụ 970436 là Vietcombank, 970422 là MB, 970415 là VietinBank, 970418 là BIDV, 970407 là Techcombank)', false),
  ('ck_so_tai_khoan',        '',      'Số tài khoản ngân hàng nhận chuyển khoản (chỉ gồm chữ số)', false),
  ('ck_ten_tai_khoan',       '',      'Tên chủ tài khoản nhận chuyển khoản, viết hoa không dấu', false)
ON CONFLICT (khoa) DO NOTHING;

-- Thông tin tài khoản nhận chuyển khoản (admin nhập ở trang Tham số). Chỉ thu ngân, chủ nuôi và admin gọi được;
-- trả về null nếu chưa nhập đủ hoặc sai định dạng, khi đó giao diện không hiện mã QR.
CREATE OR REPLACE FUNCTION thong_tin_chuyen_khoan() RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT CASE WHEN x.b ~ '^[0-9]{6}$' AND x.s ~ '^[0-9]{6,19}$' AND x.t <> ''
              THEN jsonb_build_object('bin', x.b, 'so_tai_khoan', x.s, 'ten', x.t) END
    FROM (SELECT coalesce((SELECT btrim(gia_tri) FROM cau_hinh WHERE khoa = 'ck_ma_ngan_hang'), '') AS b,
                 coalesce((SELECT btrim(gia_tri) FROM cau_hinh WHERE khoa = 'ck_so_tai_khoan'), '') AS s,
                 coalesce((SELECT btrim(gia_tri) FROM cau_hinh WHERE khoa = 'ck_ten_tai_khoan'), '') AS t) x
   WHERE vai_tro_hieu_luc() IN ('thu_ngan', 'chu_nuoi', 'admin')
$$;

REVOKE EXECUTE ON FUNCTION thong_tin_chuyen_khoan() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION thong_tin_chuyen_khoan() TO authenticated;
