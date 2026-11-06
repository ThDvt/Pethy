-- =====================================================================
-- 14_truc_tuyen.sql: bật Supabase Realtime cho tin_nhan, lich_hen, hoa_don để giao diện cập nhật tức thời giữa các tài khoản
-- (không phải tải lại trang). Dành cho cơ sở dữ liệu ĐÃ cài từ trước; bản cài mới đã có trong 02. Chạy lại nhiều lần được.
-- Dữ liệu vẫn chịu chính sách RLS: mỗi người chỉ nhận thay đổi của những dòng mình được phép đọc.
-- Chạy trong Supabase: SQL Editor, dán toàn bộ nội dung rồi Run.
-- =====================================================================
DO $$
DECLARE b text;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    FOREACH b IN ARRAY ARRAY['tin_nhan', 'lich_hen', 'hoa_don'] LOOP
      IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = b) THEN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', b);
      END IF;
    END LOOP;
  END IF;
END
$$;
