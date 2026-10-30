-- =====================================================================
-- 11_gioi_han_do_dai.sql: giới hạn độ dài cho các cột văn bản do người dùng nhập.
-- Trước đây giao diện chặn độ dài nhưng cơ sở dữ liệu thì không, nên gọi thẳng API vẫn lưu được chuỗi hàng nghìn ký tự và làm vỡ giao diện.
-- Dành cho cơ sở dữ liệu ĐÃ cài từ trước (bản cài mới đã có sẵn trong 01). Chạy lại nhiều lần được.
-- Ràng buộc để NOT VALID: dữ liệu cũ không bị kiểm tra lại (không bao giờ làm hỏng bản ghi đang có), mọi thêm/sửa từ nay đều bị kiểm tra.
-- Chạy trong Supabase: SQL Editor, dán toàn bộ nội dung rồi Run.
-- =====================================================================
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('thu_cung',  'ten',      100),
    ('thu_cung',  'loai',      60),
    ('chu_nuoi',  'ho_ten',   120),
    ('chu_nuoi',  'dia_chi',  300),
    ('dich_vu',   'ten',      120),
    ('thuoc',     'ten',      120),
    ('thuoc',     'don_vi',    30),
    ('lich_hen',  'ghi_chu',  300),
    ('lich_hen',  'ly_do_huy', 200),
    ('ho_so_kham','chan_doan',1000),
    ('ho_so_kham','ghi_chu',   300),
    ('ct_don_thuoc','lieu_dung',120),
    ('lo_thuoc',  'so_lo',      40),
    ('bien_dong_kho','ly_do',  200)
  ) AS v(bang, cot, toi_da) LOOP
    EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I', r.bang, r.bang || '_' || r.cot || '_gioi_han');
    EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I CHECK (%I IS NULL OR length(%I) <= %s) NOT VALID',
                   r.bang, r.bang || '_' || r.cot || '_gioi_han', r.cot, r.cot, r.toi_da);
  END LOOP;
END $$;
