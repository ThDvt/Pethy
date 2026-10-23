-- =====================================================================
-- 06_mo_ta_dich_vu_va_lich_bac_si.sql: thêm mô tả dịch vụ và lịch làm việc công khai của bác sĩ.
-- Dành cho cơ sở dữ liệu ĐÃ cài từ trước (bản cài mới đã có sẵn trong 01/02/03). Chạy lại nhiều lần được.
-- Chạy trong Supabase: SQL Editor, dán toàn bộ nội dung rồi Run.
-- =====================================================================
ALTER TABLE dich_vu ADD COLUMN IF NOT EXISTS mo_ta text;
ALTER TABLE dich_vu DROP CONSTRAINT IF EXISTS dich_vu_mo_ta_check;
ALTER TABLE dich_vu ADD CONSTRAINT dich_vu_mo_ta_check CHECK (mo_ta IS NULL OR length(mo_ta) <= 500);

GRANT INSERT (mo_ta), UPDATE (mo_ta) ON dich_vu TO authenticated;

CREATE OR REPLACE VIEW bac_si_cong_khai AS
SELECT k.id, k.ho_ten, h.chuyen_mon, h.gioi_thieu, h.anh_dai_dien,
       (SELECT coalesce(jsonb_agg(jsonb_build_object('thu', w.thu_trong_tuan, 'tu', to_char(w.gio_bat_dau,'HH24:MI'), 'den', to_char(w.gio_ket_thuc,'HH24:MI'))
                                  ORDER BY w.thu_trong_tuan, w.gio_bat_dau), '[]'::jsonb)
          FROM lich_lam_viec w WHERE w.bac_si_id = k.id) AS lich_lam_viec
  FROM tai_khoan k
  JOIN ho_so_bac_si h ON h.tai_khoan_id = k.id
 WHERE k.vai_tro = 'bac_si' AND k.trang_thai = 'hoat_dong';
