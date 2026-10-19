-- Hàm hỗ trợ kiểm thử (CHỈ dùng cục bộ). Chạy bằng quyền postgres sau khi nạp 4 file chính.
-- Chuyển vai bằng SET ROLE + request.jwt.claim.sub, giống cách Supabase gọi từ trình duyệt.
DROP SCHEMA IF EXISTS t CASCADE;
CREATE SCHEMA t;
GRANT USAGE ON SCHEMA t TO PUBLIC;

CREATE TABLE t.result (n serial PRIMARY KEY, nhom text, ten text, ok boolean NOT NULL, chi_tiet text);
CREATE TABLE t.vars (k text PRIMARY KEY, v text);
GRANT ALL ON t.result, t.vars TO PUBLIC;
GRANT ALL ON SEQUENCE t.result_n_seq TO PUBLIC;

CREATE FUNCTION t.set(k text, v text) RETURNS void LANGUAGE sql AS $$
  INSERT INTO t.vars VALUES ($1, $2) ON CONFLICT (k) DO UPDATE SET v = EXCLUDED.v
$$;
CREATE FUNCTION t.get(k text) RETURNS text LANGUAGE sql STABLE AS $$
  SELECT v FROM t.vars WHERE vars.k = $1
$$;
CREATE FUNCTION t.u(k text) RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT t.get($1)::uuid $$;

-- Ghi một kết quả kiểm tra.
CREATE FUNCTION t.kt(ten text, dieu_kien boolean, chi_tiet text DEFAULT NULL) RETURNS void LANGUAGE sql AS $$
  INSERT INTO t.result (nhom, ten, ok, chi_tiet)
  VALUES (t.get('nhom'), $1, coalesce($2, false), $3)
$$;

-- Chạy một câu lệnh, trả về mã lỗi nghiệp vụ (HINT) hoặc SQLSTATE, 'OK' nếu thành công.
CREATE FUNCTION t.err(q text) RETURNS text LANGUAGE plpgsql AS $$
DECLARE h text; s text;
BEGIN
  EXECUTE q;
  RETURN 'OK';
EXCEPTION WHEN OTHERS THEN
  GET STACKED DIAGNOSTICS h = PG_EXCEPTION_HINT, s = RETURNED_SQLSTATE;
  RETURN coalesce(nullif(h, ''), s);
END $$;

-- Kỳ vọng câu lệnh thất bại với đúng mã lỗi.
CREATE FUNCTION t.loi(ten text, q text, ma text) RETURNS void LANGUAGE plpgsql AS $$
DECLARE r text := t.err(q);
BEGIN
  INSERT INTO t.result (nhom, ten, ok, chi_tiet)
  VALUES (t.get('nhom'), ten, r = ma, CASE WHEN r = ma THEN NULL ELSE 'mong đợi ' || ma || ', nhận ' || r END);
END $$;

-- Kỳ vọng câu lệnh thành công.
CREATE FUNCTION t.thanh_cong(ten text, q text) RETURNS void LANGUAGE plpgsql AS $$
DECLARE r text := t.err(q);
BEGIN
  INSERT INTO t.result (nhom, ten, ok, chi_tiet)
  VALUES (t.get('nhom'), ten, r = 'OK', CASE WHEN r = 'OK' THEN NULL ELSE 'bị lỗi ' || r END);
END $$;

-- Lấy giá trị đầu tiên của một truy vấn (dưới quyền đang dùng).
CREATE FUNCTION t.val(q text) RETURNS text LANGUAGE plpgsql AS $$
DECLARE v text;
BEGIN
  EXECUTE q INTO v;
  RETURN v;
END $$;

-- Đếm hàng bất kể quyền (dùng để xác minh trạng thái thật trong CSDL).
CREATE FUNCTION t.dem(bang text, dieu_kien text DEFAULT 'true') RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE n integer;
BEGIN
  EXECUTE format('SELECT count(*) FROM %I WHERE %s', bang, dieu_kien) INTO n;
  RETURN n;
END $$;

-- Tồn kho của một lô theo số lô (bất kể quyền).
CREATE FUNCTION t.ton(so_lo text) RETURNS integer
LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT coalesce(sum(b.so_luong), 0)::integer
    FROM bien_dong_kho b JOIN lo_thuoc l ON l.id = b.lo_thuoc_id WHERE l.so_lo = $1
$$;

-- Khung giờ thứ n (n = 0 là 08:00, mỗi khung 30 phút) của ngày hôm nay + d (giờ Việt Nam).
CREATE FUNCTION t.slot(d integer, n integer) RETURNS timestamptz LANGUAGE sql STABLE AS $$
  SELECT ((public.hom_nay() + $1) + time '08:00' + $2 * interval '30 minutes') AT TIME ZONE 'Asia/Ho_Chi_Minh'
$$;

-- Chuyển vai.
CREATE FUNCTION t.as_user(k text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  RESET ROLE;
  PERFORM set_config('request.jwt.claim.sub', t.get(k), false);
  SET ROLE authenticated;
END $$;
CREATE FUNCTION t.as_anon() RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  RESET ROLE;
  PERFORM set_config('request.jwt.claim.sub', '', false);
  SET ROLE anon;
END $$;
CREATE FUNCTION t.as_su() RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  RESET ROLE;
  PERFORM set_config('request.jwt.claim.sub', '', false);
END $$;
