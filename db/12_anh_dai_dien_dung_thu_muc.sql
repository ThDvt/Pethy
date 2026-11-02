-- =====================================================================
-- 12_anh_dai_dien_dung_thu_muc.sql: ảnh đại diện bác sĩ chỉ được trỏ vào thư mục của chính bác sĩ đó.
-- Trước đây cột anh_dai_dien là văn bản tự do. Bác sĩ A có thể đặt nó thành địa chỉ ảnh của bác sĩ B; khi admin thay hoặc gỡ ảnh
-- của A, trang admin xóa nhầm ảnh của B (admin được xóa mọi ảnh trong kho). Kiểm chứng bằng e2e/tests/18-anh-bac-si-xoa-cheo.spec.js.
-- Dành cho cơ sở dữ liệu ĐÃ cài từ trước (bản cài mới đã có sẵn trong 01). Chạy lại nhiều lần được.
-- Ràng buộc để NOT VALID: dữ liệu cũ không bị kiểm tra lại, mọi thêm/sửa từ nay đều bị kiểm tra.
-- Trước khi chạy, xem có hồ sơ cũ nào không khớp (nếu có thì sửa hồ sơ đó sẽ bị từ chối cho đến khi đặt lại ảnh):
--   SELECT tai_khoan_id, anh_dai_dien FROM ho_so_bac_si
--    WHERE anh_dai_dien IS NOT NULL AND position('/avatar-bac-si/' || tai_khoan_id::text || '/' IN anh_dai_dien) = 0;
-- Chạy trong Supabase: SQL Editor, dán toàn bộ nội dung rồi Run.
-- =====================================================================
ALTER TABLE public.ho_so_bac_si DROP CONSTRAINT IF EXISTS ho_so_bac_si_anh_dai_dien_dung_thu_muc;
ALTER TABLE public.ho_so_bac_si ADD CONSTRAINT ho_so_bac_si_anh_dai_dien_dung_thu_muc
  CHECK (anh_dai_dien IS NULL OR (length(anh_dai_dien) <= 500 AND position('/avatar-bac-si/' || tai_khoan_id::text || '/' IN anh_dai_dien) > 0)) NOT VALID;
