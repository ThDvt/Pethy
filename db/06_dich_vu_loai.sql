-- =====================================================================
-- 06_dich_vu_loai.sql: mở rộng loại dịch vụ (trước đây chỉ có khám và tiêm).
-- Dành cho cơ sở dữ liệu ĐÃ cài từ trước (bản cài mới đã có sẵn trong 01_schema.sql).
-- Có thể chạy lại nhiều lần. Chỉ loại 'tiem' kích hoạt luồng vaccine; các loại khác đặt lịch như khám.
-- =====================================================================
ALTER TABLE dich_vu DROP CONSTRAINT IF EXISTS dich_vu_loai_check;
ALTER TABLE dich_vu ADD CONSTRAINT dich_vu_loai_check
  CHECK (loai IN ('kham','tiem','xet_nghiem','phau_thuat','spa','luu_chuong','khac'));
