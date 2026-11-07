-- =====================================================================
-- 15_hoat_dong.sql: luồng "Hoạt động gần đây" cho admin (mỗi thay đổi viết thành câu dễ đọc, không có nội dung nhạy cảm).
-- Dành cho cơ sở dữ liệu ĐÃ cài từ trước (bản cài mới đã có trong 02). Chạy lại nhiều lần được.
-- Chạy trong Supabase: SQL Editor, dán toàn bộ nội dung rồi Run.
-- =====================================================================
DROP FUNCTION IF EXISTS hoat_dong_gan_day(integer, text);
-- Hoạt động gần đây cho admin: mỗi dòng nhật ký được viết thành một câu dễ đọc. Chỉ admin gọi được.
-- Cố ý KHÔNG đưa nội dung nhạy cảm vào câu: không có chẩn đoán, đơn thuốc, số điện thoại, số tài khoản hay giá trị tham số;
-- chỉ cho biết việc gì đã xảy ra, ai làm, với thú cưng hay đối tượng nào.
CREATE FUNCTION hoat_dong_gan_day(p_gioi_han integer DEFAULT 50, p_hanh_dong text DEFAULT NULL)
RETURNS TABLE (id uuid, thoi_gian timestamptz, nguoi text, vai_tro text, hanh_dong text, muc text, noi_dung text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  PERFORM _yeu_cau_vai_tro('admin');
  RETURN QUERY
  WITH n AS (
    SELECT x.id, x.thoi_gian, x.tai_khoan_id, x.hanh_dong, x.bang_tac_dong AS bang, x.gia_tri_cu AS cu, x.gia_tri_moi AS moi,
           COALESCE(x.gia_tri_moi, x.gia_tri_cu) AS v
      FROM nhat_ky x
     WHERE x.bang_tac_dong IS DISTINCT FROM 'ct_don_thuoc'
       AND (p_hanh_dong IS NULL OR x.hanh_dong = p_hanh_dong)
     ORDER BY x.thoi_gian DESC
     LIMIT LEAST(GREATEST(COALESCE(p_gioi_han, 50), 1), 200)
  ), t AS (
    SELECT n.*,
      COALESCE((SELECT c.ten FROM thu_cung c WHERE c.id = (n.v->>'thu_cung_id')::uuid),
               (SELECT c.ten FROM lich_hen l JOIN thu_cung c ON c.id = l.thu_cung_id WHERE l.id = (n.v->>'lich_hen_id')::uuid),
               (SELECT c.ten FROM hoa_don h JOIN lich_hen l ON l.id = h.lich_hen_id JOIN thu_cung c ON c.id = l.thu_cung_id WHERE h.id = (n.v->>'hoa_don_id')::uuid),
               CASE WHEN n.bang = 'thu_cung' THEN n.v->>'ten' END) AS pet,
      (SELECT d.ten FROM dich_vu d WHERE d.id = (n.v->>'dich_vu_id')::uuid) AS dv,
      (SELECT b.ho_ten FROM tai_khoan b WHERE b.id = COALESCE((n.v->>'bac_si_id')::uuid, (n.v->>'tai_khoan_id')::uuid)) AS bs,
      (SELECT th.ten FROM thuoc th WHERE th.id = (n.v->>'thuoc_id')::uuid) AS thuoc_ten,
      to_char((n.v->>'thoi_gian')::timestamptz AT TIME ZONE 'Asia/Ho_Chi_Minh', 'HH24:MI DD/MM') AS gio,
      replace(to_char(COALESCE((n.v->>'tong_tien')::numeric, (n.v->>'so_tien')::numeric), 'FM999G999G999G999'), ',', '.') AS tien
      FROM n
  )
  SELECT t.id, t.thoi_gian, COALESCE(k.ho_ten, 'Hệ thống / SQL'), k.vai_tro, t.hanh_dong,
    CASE t.bang
      WHEN 'lich_hen' THEN 'lich' WHEN 'lich_lam_viec' THEN 'lich'
      WHEN 'hoa_don' THEN 'tien' WHEN 'thanh_toan' THEN 'tien'
      WHEN 'thuoc' THEN 'kho' WHEN 'lo_thuoc' THEN 'kho'
      WHEN 'ho_so_kham' THEN 'kham' WHEN 'don_thuoc' THEN 'kham' WHEN 'mui_tiem' THEN 'kham'
      WHEN 'tai_khoan' THEN 'nguoi' WHEN 'chu_nuoi' THEN 'nguoi' WHEN 'thu_cung' THEN 'nguoi' WHEN 'ho_so_bac_si' THEN 'nguoi'
      WHEN 'cau_hinh' THEN 'he_thong'
      ELSE 'noi_dung' END,
    CASE
      WHEN t.bang = 'ho_so_kham' AND t.hanh_dong = 'xem' THEN 'Xem hồ sơ khám của ' || COALESCE(t.pet, 'một thú cưng')
      WHEN t.bang = 'lich_hen' AND t.hanh_dong = 'them' THEN 'Đặt lịch ' || COALESCE(lower(t.dv), 'khám') || ' cho ' || COALESCE(t.pet, 'thú cưng') || ' lúc ' || t.gio
      WHEN t.bang = 'lich_hen' AND t.hanh_dong = 'xoa' THEN 'Xóa lịch của ' || COALESCE(t.pet, 'thú cưng') || ' lúc ' || t.gio
      WHEN t.bang = 'lich_hen' THEN CASE t.moi->>'trang_thai'
          WHEN 'da_xac_nhan' THEN 'Xác nhận lịch của ' WHEN 'da_huy' THEN 'Hủy lịch của ' WHEN 'da_hoan_thanh' THEN 'Hoàn thành khám cho '
          WHEN 'khong_den' THEN 'Đánh dấu không đến: ' ELSE 'Sửa lịch của ' END
          || COALESCE(t.pet, 'thú cưng') || CASE WHEN t.moi->>'trang_thai' = 'da_hoan_thanh' THEN '' ELSE ' lúc ' || t.gio END
          || CASE WHEN t.moi->>'trang_thai' IS NOT DISTINCT FROM t.cu->>'trang_thai' THEN ' (đổi thông tin)' ELSE '' END
      WHEN t.bang = 'hoa_don' AND t.hanh_dong = 'them' THEN 'Lập hóa đơn ' || t.tien || ' đ cho ' || COALESCE(t.pet, 'thú cưng')
      WHEN t.bang = 'hoa_don' THEN 'Hóa đơn của ' || COALESCE(t.pet, 'thú cưng') || ' ' || CASE t.moi->>'trang_thai'
          WHEN 'da_thanh_toan' THEN 'đã thanh toán đủ' WHEN 'thanh_toan_mot_phan' THEN 'đã thanh toán một phần'
          WHEN 'da_huy' THEN 'đã hủy' ELSE 'được cập nhật' END
      WHEN t.bang = 'thanh_toan' THEN 'Thu ' || t.tien || ' đ (' || CASE t.v->>'phuong_thuc' WHEN 'tien_mat' THEN 'tiền mặt' ELSE 'chuyển khoản' END || ') cho ' || COALESCE(t.pet, 'thú cưng')
      WHEN t.bang = 'ho_so_kham' THEN CASE t.hanh_dong WHEN 'them' THEN 'Ghi hồ sơ khám cho ' WHEN 'sua' THEN 'Sửa hồ sơ khám của ' ELSE 'Xóa hồ sơ khám của ' END || COALESCE(t.pet, 'thú cưng')
      WHEN t.bang = 'don_thuoc' THEN 'Kê đơn thuốc'
      WHEN t.bang = 'mui_tiem' THEN 'Ghi mũi tiêm ' || COALESCE(t.thuoc_ten, '') || ' cho ' || COALESCE(t.pet, 'thú cưng')
      WHEN t.bang = 'tai_khoan' THEN CASE
          WHEN t.hanh_dong = 'them' THEN 'Tạo tài khoản ' || (t.v->>'ho_ten') || ' (' || CASE (t.v->>'vai_tro') WHEN 'admin' THEN 'quản trị' WHEN 'bac_si' THEN 'bác sĩ' WHEN 'le_tan' THEN 'lễ tân' WHEN 'thu_ngan' THEN 'thu ngân' WHEN 'kho' THEN 'thủ kho' WHEN 'chu_nuoi' THEN 'chủ nuôi' ELSE (t.v->>'vai_tro') END || ')'
          WHEN t.hanh_dong = 'xoa' THEN 'Xóa tài khoản ' || COALESCE(t.v->>'ho_ten', '')
          WHEN t.moi->>'trang_thai' IS DISTINCT FROM t.cu->>'trang_thai' THEN CASE WHEN t.moi->>'trang_thai' = 'khoa' THEN 'Khóa tài khoản ' ELSE 'Mở khóa tài khoản ' END || (t.v->>'ho_ten')
          WHEN t.moi->>'vai_tro' IS DISTINCT FROM t.cu->>'vai_tro' THEN 'Đổi vai trò của ' || (t.v->>'ho_ten') || ' thành ' || CASE (t.moi->>'vai_tro') WHEN 'admin' THEN 'quản trị' WHEN 'bac_si' THEN 'bác sĩ' WHEN 'le_tan' THEN 'lễ tân' WHEN 'thu_ngan' THEN 'thu ngân' WHEN 'kho' THEN 'thủ kho' WHEN 'chu_nuoi' THEN 'chủ nuôi' ELSE (t.moi->>'vai_tro') END
          ELSE 'Sửa thông tin tài khoản ' || (t.v->>'ho_ten') END
      WHEN t.bang = 'chu_nuoi' THEN CASE t.hanh_dong WHEN 'them' THEN 'Thêm khách ' WHEN 'sua' THEN 'Sửa thông tin khách ' ELSE 'Xóa khách ' END || COALESCE(t.v->>'ho_ten', '')
      WHEN t.bang = 'thu_cung' THEN CASE t.hanh_dong WHEN 'them' THEN 'Thêm thú cưng ' WHEN 'sua' THEN 'Sửa thông tin thú cưng ' ELSE 'Xóa thú cưng ' END || COALESCE(t.v->>'ten', '')
      WHEN t.bang = 'ho_so_bac_si' THEN 'Cập nhật hồ sơ giới thiệu của bác sĩ ' || COALESCE(t.bs, '')
      WHEN t.bang = 'lich_lam_viec' THEN CASE t.hanh_dong WHEN 'them' THEN 'Thêm ca làm việc của ' WHEN 'sua' THEN 'Sửa ca làm việc của ' ELSE 'Xóa ca làm việc của ' END || COALESCE(t.bs, 'bác sĩ') || ' (' || left(t.v->>'gio_bat_dau', 5) || ' đến ' || left(t.v->>'gio_ket_thuc', 5) || ')'
      WHEN t.bang = 'dich_vu' THEN CASE
          WHEN t.hanh_dong = 'them' THEN 'Thêm dịch vụ ' || (t.v->>'ten')
          WHEN t.hanh_dong = 'xoa' THEN 'Xóa dịch vụ ' || (t.v->>'ten')
          WHEN t.moi->>'gia' IS DISTINCT FROM t.cu->>'gia' THEN 'Đổi giá dịch vụ ' || (t.v->>'ten') || ' thành ' || replace(to_char((t.moi->>'gia')::numeric, 'FM999G999G999'), ',', '.') || ' đ'
          WHEN t.moi->>'dang_ap_dung' IS DISTINCT FROM t.cu->>'dang_ap_dung' THEN CASE WHEN (t.moi->>'dang_ap_dung')::boolean THEN 'Áp dụng lại dịch vụ ' ELSE 'Ngừng dịch vụ ' END || (t.v->>'ten')
          ELSE 'Sửa dịch vụ ' || (t.v->>'ten') END
      WHEN t.bang = 'thuoc' THEN CASE t.hanh_dong WHEN 'them' THEN 'Thêm thuốc ' WHEN 'sua' THEN 'Sửa thuốc ' ELSE 'Xóa thuốc ' END || (t.v->>'ten')
      WHEN t.bang = 'lo_thuoc' THEN CASE t.hanh_dong WHEN 'them' THEN 'Nhập lô ' ELSE 'Sửa lô ' END || (t.v->>'so_lo') || ' của ' || COALESCE(t.thuoc_ten, 'thuốc')
      WHEN t.bang = 'cau_hinh' THEN 'Đổi tham số: ' || CASE WHEN length(COALESCE(t.v->>'mo_ta', '')) > 70 THEN left(t.v->>'mo_ta', 70) || '…' ELSE COALESCE(t.v->>'mo_ta', t.v->>'khoa') END
      WHEN t.bang = 'danh_gia' THEN CASE WHEN t.hanh_dong = 'them' THEN 'Khách đánh giá ' || (t.v->>'so_sao') || ' sao cho ' || COALESCE(t.pet, 'một lượt khám')
          WHEN t.moi->>'hien_thi' IS DISTINCT FROM t.cu->>'hien_thi' THEN CASE WHEN (t.moi->>'hien_thi')::boolean THEN 'Hiện đánh giá' ELSE 'Ẩn đánh giá' END
          ELSE 'Sửa đánh giá' END
      WHEN t.bang = 'bai_viet' THEN CASE t.hanh_dong WHEN 'them' THEN 'Thêm bài viết ' WHEN 'sua' THEN 'Sửa bài viết ' ELSE 'Xóa bài viết ' END || '"' || COALESCE(t.v->>'tieu_de', '') || '"'
      ELSE CASE t.hanh_dong WHEN 'them' THEN 'Thêm ' WHEN 'sua' THEN 'Sửa ' ELSE 'Xóa ' END || COALESCE(t.bang, 'dữ liệu')
    END
  FROM t LEFT JOIN tai_khoan k ON k.id = t.tai_khoan_id
  ORDER BY t.thoi_gian DESC;
END
$$;

REVOKE EXECUTE ON FUNCTION hoat_dong_gan_day(integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION hoat_dong_gan_day(integer, text) TO authenticated;
