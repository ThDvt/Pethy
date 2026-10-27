-- =====================================================================
-- 09_chung_chi_bac_si.sql: thêm trình độ, số năm kinh nghiệm và chứng chỉ vào hồ sơ công khai của bác sĩ.
-- Dành cho cơ sở dữ liệu ĐÃ cài từ trước (bản cài mới đã có sẵn trong 01/02/03). Chạy lại nhiều lần được.
-- Chạy trong Supabase: SQL Editor, dán toàn bộ nội dung rồi Run.
-- =====================================================================
ALTER TABLE ho_so_bac_si ADD COLUMN IF NOT EXISTS trinh_do text;
ALTER TABLE ho_so_bac_si ADD COLUMN IF NOT EXISTS kinh_nghiem_nam smallint;
ALTER TABLE ho_so_bac_si ADD COLUMN IF NOT EXISTS chung_chi text;
ALTER TABLE ho_so_bac_si DROP CONSTRAINT IF EXISTS ho_so_bac_si_trinh_do_check;
ALTER TABLE ho_so_bac_si DROP CONSTRAINT IF EXISTS ho_so_bac_si_kinh_nghiem_nam_check;
ALTER TABLE ho_so_bac_si DROP CONSTRAINT IF EXISTS ho_so_bac_si_chung_chi_check;
ALTER TABLE ho_so_bac_si ADD CONSTRAINT ho_so_bac_si_trinh_do_check CHECK (trinh_do IS NULL OR length(trinh_do) <= 200);
ALTER TABLE ho_so_bac_si ADD CONSTRAINT ho_so_bac_si_kinh_nghiem_nam_check CHECK (kinh_nghiem_nam IS NULL OR kinh_nghiem_nam BETWEEN 0 AND 60);
ALTER TABLE ho_so_bac_si ADD CONSTRAINT ho_so_bac_si_chung_chi_check CHECK (chung_chi IS NULL OR length(chung_chi) <= 600);

GRANT INSERT (trinh_do, kinh_nghiem_nam, chung_chi), UPDATE (trinh_do, kinh_nghiem_nam, chung_chi) ON ho_so_bac_si TO authenticated;

CREATE OR REPLACE VIEW bac_si_cong_khai AS
SELECT k.id, k.ho_ten, h.chuyen_mon, h.gioi_thieu, h.anh_dai_dien,
       (SELECT coalesce(jsonb_agg(jsonb_build_object('thu', w.thu_trong_tuan, 'tu', to_char(w.gio_bat_dau,'HH24:MI'), 'den', to_char(w.gio_ket_thuc,'HH24:MI'))
                                  ORDER BY w.thu_trong_tuan, w.gio_bat_dau), '[]'::jsonb)
          FROM lich_lam_viec w WHERE w.bac_si_id = k.id) AS lich_lam_viec,
       (SELECT round(avg(d.so_sao), 1) FROM danh_gia d JOIN lich_hen l ON l.id = d.lich_hen_id
         WHERE l.bac_si_id = k.id AND d.hien_thi) AS diem_tb,
       (SELECT count(*)::int FROM danh_gia d JOIN lich_hen l ON l.id = d.lich_hen_id
         WHERE l.bac_si_id = k.id AND d.hien_thi) AS so_danh_gia,
       h.trinh_do, h.kinh_nghiem_nam, h.chung_chi
  FROM tai_khoan k
  JOIN ho_so_bac_si h ON h.tai_khoan_id = k.id
 WHERE k.vai_tro = 'bac_si' AND k.trang_thai = 'hoat_dong';
