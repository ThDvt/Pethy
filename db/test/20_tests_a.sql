\set ON_ERROR_STOP on
-- =====================================================================
-- PHẦN A: cấu trúc, đăng ký, vai trò, khách, dữ liệu nền, đặt lịch
-- =====================================================================

-- ---------------------------------------------------------------------
SELECT t.set('nhom', '01 Cấu trúc và quyền mặc định');
-- ---------------------------------------------------------------------
SELECT t.kt('20 bảng đều bật RLS',
  (SELECT count(*) = 20 AND count(*) FILTER (WHERE relrowsecurity) = 20
     FROM pg_class WHERE relnamespace = 'public'::regnamespace AND relkind = 'r'));

SELECT t.kt('Bảng giao dịch: client không có INSERT/UPDATE/DELETE/TRUNCATE trực tiếp',
  NOT EXISTS (
    SELECT 1
      FROM unnest(ARRAY['lich_hen','ho_so_kham','don_thuoc','ct_don_thuoc','mui_tiem','bien_dong_kho',
                        'lo_thuoc','hoa_don','ct_hoa_don','thanh_toan','nhat_ky','nhac_lich']) x(b),
           unnest(ARRAY['INSERT','UPDATE','DELETE','TRUNCATE']) p(q)
     WHERE has_table_privilege('authenticated', 'public.' || x.b, p.q)
        OR has_table_privilege('anon', 'public.' || x.b, p.q)));

SELECT t.kt('tai_khoan: không INSERT/DELETE, không UPDATE cột vai_tro, trang_thai, id',
  NOT has_table_privilege('authenticated', 'public.tai_khoan', 'INSERT')
  AND NOT has_table_privilege('authenticated', 'public.tai_khoan', 'DELETE')
  AND NOT has_column_privilege('authenticated', 'public.tai_khoan', 'vai_tro', 'UPDATE')
  AND NOT has_column_privilege('authenticated', 'public.tai_khoan', 'trang_thai', 'UPDATE')
  AND NOT has_column_privilege('authenticated', 'public.tai_khoan', 'id', 'UPDATE')
  AND has_column_privilege('authenticated', 'public.tai_khoan', 'ho_ten', 'UPDATE'));

SELECT t.kt('chu_nuoi: không DELETE, không ghi cột tai_khoan_id từ client',
  NOT has_table_privilege('authenticated', 'public.chu_nuoi', 'DELETE')
  AND NOT has_column_privilege('authenticated', 'public.chu_nuoi', 'tai_khoan_id', 'INSERT')
  AND NOT has_column_privilege('authenticated', 'public.chu_nuoi', 'tai_khoan_id', 'UPDATE'));

SELECT t.kt('thu_cung, dich_vu, thuoc: không DELETE từ client',
  NOT has_table_privilege('authenticated', 'public.thu_cung', 'DELETE')
  AND NOT has_table_privilege('authenticated', 'public.dich_vu', 'DELETE')
  AND NOT has_table_privilege('authenticated', 'public.thuoc', 'DELETE'));

SELECT t.kt('anon chỉ SELECT cau_hinh, dich_vu, bac_si_cong_khai',
  has_table_privilege('anon', 'public.cau_hinh', 'SELECT')
  AND has_table_privilege('anon', 'public.dich_vu', 'SELECT')
  AND has_table_privilege('anon', 'public.bac_si_cong_khai', 'SELECT')
  AND NOT has_table_privilege('anon', 'public.tai_khoan', 'SELECT')
  AND NOT has_table_privilege('anon', 'public.lich_hen', 'SELECT')
  AND NOT has_table_privilege('anon', 'public.ton_kho_lo', 'SELECT')
  AND NOT has_table_privilege('anon', 'public.thuoc', 'SELECT'));

SELECT t.kt('Hàm nghiệp vụ: authenticated gọi được, anon không',
  has_function_privilege('authenticated', 'public.dat_lich(uuid,uuid,uuid,timestamptz,uuid,text)', 'EXECUTE')
  AND NOT has_function_privilege('anon', 'public.dat_lich(uuid,uuid,uuid,timestamptz,uuid,text)', 'EXECUTE')
  AND has_function_privilege('authenticated', 'public.ke_don(uuid,jsonb)', 'EXECUTE')
  AND NOT has_function_privilege('anon', 'public.ke_don(uuid,jsonb)', 'EXECUTE'));

SELECT t.kt('Hàm nội bộ (_xuat_kho, _khung_gio, _yeu_cau_vai_tro, _loi): client không gọi được',
  NOT has_function_privilege('authenticated', 'public._xuat_kho(uuid,integer,text,uuid,uuid)', 'EXECUTE')
  AND NOT has_function_privilege('authenticated', 'public._khung_gio(uuid,date,boolean)', 'EXECUTE')
  AND NOT has_function_privilege('authenticated', 'public._yeu_cau_vai_tro(text[])', 'EXECUTE')
  AND NOT has_function_privilege('authenticated', 'public._loi(text,text)', 'EXECUTE')
  AND NOT has_function_privilege('anon', 'public._xuat_kho(uuid,integer,text,uuid,uuid)', 'EXECUTE'));

SELECT t.kt('Cấu hình khởi tạo có đủ 8 khóa', t.dem('cau_hinh') = 8);

-- ---------------------------------------------------------------------
SELECT t.set('nhom', '02 Đăng ký và tài khoản');
-- ---------------------------------------------------------------------
DO $$
DECLARE k text; v uuid;
BEGIN
  FOREACH k IN ARRAY ARRAY['admin','b1','b2','le_tan','thu_ngan','kho','chu1','chu2','chu3','tam'] LOOP
    INSERT INTO auth.users (email, raw_user_meta_data)
    VALUES (k || '@test.vn', jsonb_build_object('ho_ten', 'Test ' || k)) RETURNING id INTO v;
    PERFORM t.set(k, v::text);
  END LOOP;
  INSERT INTO auth.users (email, raw_user_meta_data)
  VALUES ('chu4@test.vn', '{"ho_ten":"Chủ Bốn","so_dien_thoai":"0987654321"}') RETURNING id INTO v;
  PERFORM t.set('chu4', v::text);
  INSERT INTO auth.users (email, raw_user_meta_data)
  VALUES ('hacker@test.vn', '{"ho_ten":"Hacker","vai_tro":"admin","so_dien_thoai":"0912345678"}') RETURNING id INTO v;
  PERFORM t.set('hacker', v::text);
  INSERT INTO auth.users (email, raw_user_meta_data)
  VALUES ('saisdt@test.vn', '{"ho_ten":"Sai SDT","so_dien_thoai":"abc"}') RETURNING id INTO v;
  PERFORM t.set('saisdt', v::text);
END $$;

SELECT t.kt('Đăng ký tạo tai_khoan vai trò chu_nuoi, trạng thái hoạt động',
  t.dem('tai_khoan', $$vai_tro = 'chu_nuoi' AND trang_thai = 'hoat_dong'$$) = 13);
SELECT t.kt('Gửi vai_tro=admin trong metadata KHÔNG nâng quyền',
  t.val($$SELECT vai_tro FROM tai_khoan WHERE id = t.u('hacker')$$) = 'chu_nuoi');
SELECT t.kt('Có số điện thoại hợp lệ trong metadata thì tự tạo hồ sơ chu_nuoi',
  t.dem('chu_nuoi', format('tai_khoan_id = %L', t.get('chu4'))) = 1
  AND t.dem('chu_nuoi', format('tai_khoan_id = %L', t.get('hacker'))) = 1);
SELECT t.kt('Số điện thoại sai định dạng bị bỏ qua, không tạo chu_nuoi',
  t.val($$SELECT so_dien_thoai FROM tai_khoan WHERE id = t.u('saisdt')$$) IS NULL
  AND t.dem('chu_nuoi', format('tai_khoan_id = %L', t.get('saisdt'))) = 0);
SELECT t.kt('Đăng ký không có số điện thoại thì chưa có hồ sơ chu_nuoi',
  t.dem('chu_nuoi', format('tai_khoan_id = %L', t.get('chu1'))) = 0);

UPDATE tai_khoan SET vai_tro = 'admin' WHERE id = t.u('admin');   -- admin đầu tiên (cách làm trong README)

SELECT t.as_user('admin');
SELECT t.thanh_cong('admin gán vai trò bác sĩ cho b1', format($q$SELECT dat_vai_tro(%L, 'bac_si')$q$, t.get('b1')));
SELECT dat_vai_tro(t.u('b2'), 'bac_si');
SELECT dat_vai_tro(t.u('le_tan'), 'le_tan');
SELECT dat_vai_tro(t.u('thu_ngan'), 'thu_ngan');
SELECT dat_vai_tro(t.u('kho'), 'kho');
SELECT t.kt('Gán bác sĩ tự tạo ho_so_bac_si', t.dem('ho_so_bac_si') = 2);
SELECT t.kt('Vai trò đã được gán đúng',
  t.val($$SELECT string_agg(vai_tro, ',' ORDER BY vai_tro) FROM tai_khoan WHERE id IN
           (t.u('b1'), t.u('b2'), t.u('le_tan'), t.u('thu_ngan'), t.u('kho'))$$) = 'bac_si,bac_si,kho,le_tan,thu_ngan');
SELECT t.loi('admin không tự đổi vai trò của mình',
  format($q$SELECT dat_vai_tro(%L, 'chu_nuoi')$q$, t.get('admin')), 'KHONG_TU_DOI_VAI_TRO');
SELECT t.loi('Vai trò không hợp lệ bị từ chối',
  format($q$SELECT dat_vai_tro(%L, 'sieu_nhan')$q$, t.get('chu1')), 'VAI_TRO_KHONG_HOP_LE');
SELECT t.loi('Gán lại cùng vai trò báo KHONG_THAY_DOI',
  format($q$SELECT dat_vai_tro(%L, 'chu_nuoi')$q$, t.get('chu1')), 'KHONG_THAY_DOI');

SELECT t.as_user('chu1');
SELECT t.loi('chu_nuoi không gọi được dat_vai_tro',
  format($q$SELECT dat_vai_tro(%L, 'admin')$q$, t.get('chu1')), 'KHONG_CO_QUYEN');
SELECT t.loi('chu_nuoi không tự UPDATE vai_tro (quyền cột)',
  $q$UPDATE tai_khoan SET vai_tro = 'admin' WHERE id = auth.uid()$q$, '42501');
SELECT t.loi('chu_nuoi không tự UPDATE trang_thai',
  $q$UPDATE tai_khoan SET trang_thai = 'hoat_dong' WHERE id = auth.uid()$q$, '42501');
SELECT t.loi('chu_nuoi không DELETE tai_khoan',
  $q$DELETE FROM tai_khoan WHERE id = auth.uid()$q$, '42501');
SELECT t.loi('chu_nuoi không INSERT tai_khoan',
  format($q$INSERT INTO tai_khoan (id, ho_ten, vai_tro) VALUES (%L, 'x', 'admin')$q$, gen_random_uuid()), '42501');
SELECT t.thanh_cong('chu_nuoi sửa họ tên của mình', $q$UPDATE tai_khoan SET ho_ten = 'Chủ Một' WHERE id = auth.uid()$q$);
SELECT t.kt('Họ tên được cập nhật', t.val($$SELECT ho_ten FROM tai_khoan WHERE id = auth.uid()$$) = 'Chủ Một');
SELECT t.err(format($q$UPDATE tai_khoan SET ho_ten = 'Hack' WHERE id = %L$q$, t.get('chu2')));
SELECT t.kt('Sửa họ tên người khác không có tác dụng', t.dem('tai_khoan', $$ho_ten = 'Hack'$$) = 0);
SELECT t.kt('chu_nuoi chỉ thấy tài khoản của mình', (SELECT count(*) FROM tai_khoan) = 1);

SELECT t.as_user('le_tan');
SELECT t.kt('le_tan thấy mọi tài khoản', (SELECT count(*) FROM tai_khoan) = t.dem('tai_khoan'));
SELECT t.as_user('kho');
SELECT t.kt('kho chỉ thấy tài khoản của mình', (SELECT count(*) FROM tai_khoan) = 1);

-- ---------------------------------------------------------------------
SELECT t.set('nhom', '03 Khách chưa đăng nhập (anon)');
-- ---------------------------------------------------------------------
SELECT t.as_anon();
SELECT t.kt('anon đọc được 7 khóa cấu hình công khai, không thấy khóa riêng',
  (SELECT count(*) FROM cau_hinh) = 7
  AND NOT EXISTS (SELECT 1 FROM cau_hinh WHERE khoa = 'canh_bao_han_dung_ngay'));
SELECT t.loi('anon không đọc được tai_khoan', $q$SELECT * FROM tai_khoan$q$, '42501');
SELECT t.loi('anon không đọc được lich_hen', $q$SELECT * FROM lich_hen$q$, '42501');
SELECT t.loi('anon không đọc được thuoc', $q$SELECT * FROM thuoc$q$, '42501');
SELECT t.loi('anon không đọc được ton_kho_lo', $q$SELECT * FROM ton_kho_lo$q$, '42501');
SELECT t.loi('anon không gọi được dat_lich',
  format($q$SELECT dat_lich(%L, %L, %L, now())$q$, gen_random_uuid(), gen_random_uuid(), gen_random_uuid()), '42501');
SELECT t.loi('anon không ghi được cau_hinh',
  $q$UPDATE cau_hinh SET gia_tri = 'true' WHERE khoa = 'che_do_bao_tri'$q$, '42501');
SELECT t.kt('anon thấy danh sách bác sĩ công khai (2 bác sĩ)', (SELECT count(*) FROM bac_si_cong_khai) = 2);
SELECT t.kt('View bác sĩ công khai chỉ có 5 cột an toàn',
  (SELECT string_agg(column_name, ',' ORDER BY column_name) FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bac_si_cong_khai')
  = 'anh_dai_dien,chuyen_mon,gioi_thieu,ho_ten,id');

-- ---------------------------------------------------------------------
SELECT t.set('nhom', '04 Dữ liệu nền: lịch làm việc, dịch vụ, thuốc, kho');
-- ---------------------------------------------------------------------
SELECT t.as_user('admin');
INSERT INTO lich_lam_viec (bac_si_id, thu_trong_tuan, gio_bat_dau, gio_ket_thuc)
SELECT b, d, '08:00', '12:00' FROM unnest(ARRAY[t.u('b1'), t.u('b2')]) b, generate_series(1, 7) d;
SELECT t.kt('admin tạo lịch làm việc 2 bác sĩ x 7 ngày', t.dem('lich_lam_viec') = 14);
SELECT t.loi('Lịch làm việc cho tài khoản không phải bác sĩ bị từ chối',
  format($q$INSERT INTO lich_lam_viec (bac_si_id, thu_trong_tuan, gio_bat_dau, gio_ket_thuc)
            VALUES (%L, 1, '08:00', '12:00')$q$, t.get('chu1')), 'KHONG_PHAI_BAC_SI');
SELECT t.loi('Giờ kết thúc phải sau giờ bắt đầu',
  format($q$INSERT INTO lich_lam_viec (bac_si_id, thu_trong_tuan, gio_bat_dau, gio_ket_thuc)
            VALUES (%L, 1, '15:00', '14:00')$q$, t.get('b1')), '23514');

WITH x AS (INSERT INTO dich_vu (ten, loai, gia) VALUES ('Khám tổng quát', 'kham', 150000) RETURNING id)
SELECT t.set('dv_kham', id::text) FROM x;
WITH x AS (INSERT INTO dich_vu (ten, loai, gia) VALUES ('Tiêm phòng dại', 'tiem', 120000) RETURNING id)
SELECT t.set('dv_tiem', id::text) FROM x;
SELECT t.kt('admin tạo 2 dịch vụ', t.dem('dich_vu') = 2);
SELECT t.loi('Giá dịch vụ không được âm',
  $q$INSERT INTO dich_vu (ten, loai, gia) VALUES ('Sai giá', 'kham', -1)$q$, '23514');
SELECT t.loi('Loại dịch vụ chỉ kham hoặc tiem',
  $q$INSERT INTO dich_vu (ten, loai, gia) VALUES ('Spa', 'spa', 1000)$q$, '23514');

SELECT t.as_user('le_tan');
SELECT t.loi('le_tan không tạo được dịch vụ',
  $q$INSERT INTO dich_vu (ten, loai, gia) VALUES ('Lậu', 'kham', 1)$q$, '42501');

SELECT t.as_user('kho');
WITH x AS (INSERT INTO thuoc (ten, loai, don_vi, gia_ban) VALUES ('Amoxicillin', 'thuoc', 'viên', 2000) RETURNING id)
SELECT t.set('amox', id::text) FROM x;
WITH x AS (INSERT INTO thuoc (ten, loai, don_vi, gia_ban) VALUES ('Vitamin B', 'thuoc', 'viên', 5000) RETURNING id)
SELECT t.set('vit', id::text) FROM x;
WITH x AS (INSERT INTO thuoc (ten, loai, don_vi, gia_ban) VALUES ('Vaccine dại', 'vaccine', 'liều', 80000) RETURNING id)
SELECT t.set('vc', id::text) FROM x;
SELECT t.kt('kho tạo 3 loại thuốc/vaccine', t.dem('thuoc') = 3);
SELECT t.loi('Trùng tên và đơn vị bị từ chối',
  $q$INSERT INTO thuoc (ten, loai, don_vi, gia_ban) VALUES ('Amoxicillin', 'thuoc', 'viên', 1)$q$, '23505');

SELECT t.as_user('chu1');
SELECT t.loi('chu_nuoi không tạo được thuốc',
  $q$INSERT INTO thuoc (ten, loai, don_vi, gia_ban) VALUES ('X', 'thuoc', 'v', 1)$q$, '42501');
SELECT t.kt('chu_nuoi đọc được danh mục thuốc nhưng không thấy lô và kho',
  (SELECT count(*) FROM thuoc) = 3 AND (SELECT count(*) FROM lo_thuoc) = 0 AND (SELECT count(*) FROM bien_dong_kho) = 0);

SELECT t.as_user('kho');
SELECT t.set('loA', nhap_kho(t.u('amox'), 'A', current_date + 10, 5)::text);
SELECT t.set('loB', nhap_kho(t.u('amox'), 'B', current_date + 100, 10)::text);
SELECT t.set('loVB', nhap_kho(t.u('vit'), 'VB1', current_date + 200, 20)::text);
SELECT t.set('loV1', nhap_kho(t.u('vc'), 'V1', current_date + 200, 3)::text);
SELECT t.as_su();
-- lô đã hết hạn còn tồn 100 (để kiểm chứng FEFO bỏ qua lô quá hạn)
WITH l AS (INSERT INTO lo_thuoc (thuoc_id, so_lo, han_dung) VALUES (t.u('amox'), 'LOT-EXP', current_date - 10) RETURNING id)
INSERT INTO bien_dong_kho (lo_thuoc_id, nguoi_thuc_hien_id, loai, so_luong)
SELECT id, t.u('kho'), 'nhap', 100 FROM l;
SELECT t.kt('Tồn kho ban đầu: A=5, B=10, hết hạn=100, vitamin=20, vaccine=3',
  t.ton('A') = 5 AND t.ton('B') = 10 AND t.ton('LOT-EXP') = 100 AND t.ton('VB1') = 20 AND t.ton('V1') = 3);

-- ---------------------------------------------------------------------
SELECT t.set('nhom', '05 Chủ nuôi, thú cưng và đặt lịch');
-- ---------------------------------------------------------------------
SELECT t.as_user('chu1');
SELECT t.loi('Số điện thoại sai bị từ chối khi hoàn tất hồ sơ',
  $q$SELECT hoan_tat_ho_so_chu_nuoi('Chủ Một', '123', NULL)$q$, 'SO_DIEN_THOAI_KHONG_HOP_LE');
SELECT t.loi('Thiếu họ tên bị từ chối',
  $q$SELECT hoan_tat_ho_so_chu_nuoi('   ', '0901234567', NULL)$q$, 'THIEU_HO_TEN');
SELECT t.set('cn1', hoan_tat_ho_so_chu_nuoi('Chủ Một', '0901234567', 'Hà Nội')::text);
SELECT t.kt('chu1 có hồ sơ chu_nuoi gắn tài khoản',
  t.dem('chu_nuoi', format('id = %L AND tai_khoan_id = %L', t.get('cn1'), t.get('chu1'))) = 1);
SELECT t.kt('Gọi lại hoan_tat_ho_so_chu_nuoi cập nhật chứ không tạo thêm',
  hoan_tat_ho_so_chu_nuoi('Chủ Một', '0901234568', 'Hà Nội')::text = t.get('cn1')
  AND t.dem('chu_nuoi', format('tai_khoan_id = %L', t.get('chu1'))) = 1);
WITH x AS (INSERT INTO thu_cung (chu_nuoi_id, ten, loai) VALUES (t.u('cn1'), 'Mimi', 'Mèo') RETURNING id)
SELECT t.set('pet1', id::text) FROM x;

SELECT t.as_user('chu2');
SELECT t.set('cn2', hoan_tat_ho_so_chu_nuoi('Chủ Hai', '0902345678', NULL)::text);
WITH x AS (INSERT INTO thu_cung (chu_nuoi_id, ten, loai) VALUES (t.u('cn2'), 'Lu', 'Chó') RETURNING id)
SELECT t.set('pet2', id::text) FROM x;
SELECT t.loi('chu2 không thêm thú cưng vào hồ sơ của chu1',
  format($q$INSERT INTO thu_cung (chu_nuoi_id, ten, loai) VALUES (%L, 'Lậu', 'Chó')$q$, t.get('cn1')), '42501');
SELECT t.kt('chu2 không thấy thú cưng của chu1', NOT EXISTS (SELECT 1 FROM thu_cung WHERE id = t.u('pet1')));
SELECT t.err(format($q$UPDATE thu_cung SET ten = 'Hack' WHERE id = %L$q$, t.get('pet1')));
SELECT t.kt('chu2 sửa thú cưng của chu1 không có tác dụng', t.dem('thu_cung', $$ten = 'Hack'$$) = 0);
SELECT t.loi('chu_nuoi không tự tạo hồ sơ chu_nuoi trực tiếp',
  $q$INSERT INTO chu_nuoi (ho_ten, so_dien_thoai) VALUES ('Lậu', '0911111111')$q$, '42501');
SELECT t.loi('Không ghi được tai_khoan_id của chu_nuoi từ client',
  format($q$INSERT INTO chu_nuoi (ho_ten, so_dien_thoai, tai_khoan_id) VALUES ('Lậu', '0911111111', %L)$q$, t.get('chu2')), '42501');

-- khung giờ trống
SELECT t.as_user('chu1');
SELECT t.kt('b1 có 8 khung giờ trống (08:00-12:00, mỗi 30 phút) vào ngày hôm nay + 3',
  (SELECT count(*) FROM khung_gio_trong(t.u('b1'), public.hom_nay() + 3)) = 8);
SELECT t.kt('Khung giờ đầu 08:00 và cuối 11:30 (giờ Việt Nam)',
  (SELECT min(thoi_gian) FROM khung_gio_trong(t.u('b1'), public.hom_nay() + 3)) = t.slot(3, 0)
  AND (SELECT max(thoi_gian) FROM khung_gio_trong(t.u('b1'), public.hom_nay() + 3)) = t.slot(3, 7));
SELECT t.kt('Ngày quá 30 ngày: chu_nuoi không thấy khung giờ nào',
  (SELECT count(*) FROM khung_gio_trong(t.u('b1'), public.hom_nay() + 40)) = 0);

-- đặt lịch
SELECT t.set('L1', dat_lich(t.u('pet1'), t.u('b1'), t.u('dv_kham'), t.slot(3, 2), NULL, 'Ho nhẹ')::text);
SELECT t.kt('Chủ nuôi đặt lịch: trạng thái cho_xac_nhan, chưa có người xác nhận',
  t.dem('lich_hen', format($$id = %L AND trang_thai = 'cho_xac_nhan' AND nguoi_xac_nhan_id IS NULL AND ghi_chu = 'Ho nhẹ'$$, t.get('L1'))) = 1);
SELECT t.kt('Khung giờ đã đặt biến mất khỏi danh sách trống',
  (SELECT count(*) FROM khung_gio_trong(t.u('b1'), public.hom_nay() + 3)) = 7
  AND NOT EXISTS (SELECT 1 FROM khung_gio_trong(t.u('b1'), public.hom_nay() + 3) WHERE thoi_gian = t.slot(3, 2)));

SELECT t.as_user('chu2');
SELECT t.loi('Đặt trùng khung giờ của cùng bác sĩ bị từ chối',
  format($q$SELECT dat_lich(%L, %L, %L, %L)$q$, t.get('pet2'), t.get('b1'), t.get('dv_kham'), t.slot(3, 2)), 'KHUNG_GIO_DA_DAT');
SELECT t.set('L2', dat_lich(t.u('pet2'), t.u('b1'), t.u('dv_kham'), t.slot(3, 3), NULL, NULL)::text);
SELECT t.loi('chu2 không đặt lịch cho thú cưng của chu1',
  format($q$SELECT dat_lich(%L, %L, %L, %L)$q$, t.get('pet1'), t.get('b2'), t.get('dv_kham'), t.slot(3, 2)), 'KHONG_CO_QUYEN');
SELECT t.loi('Thú cưng không tồn tại',
  format($q$SELECT dat_lich(%L, %L, %L, %L)$q$, gen_random_uuid(), t.get('b2'), t.get('dv_kham'), t.slot(3, 2)), 'THU_CUNG_KHONG_TON_TAI');

SELECT t.as_user('chu1');
SELECT t.loi('Giờ ngoài giờ làm việc (03:00) bị từ chối',
  format($q$SELECT dat_lich(%L, %L, %L, %L)$q$, t.get('pet1'), t.get('b1'), t.get('dv_kham'), t.slot(3, -10)), 'KHUNG_GIO_KHONG_HOP_LE');
SELECT t.loi('Giờ không thẳng khung (08:15) bị từ chối',
  format($q$SELECT dat_lich(%L, %L, %L, %L)$q$, t.get('pet1'), t.get('b1'), t.get('dv_kham'), t.slot(3, 0) + interval '15 minutes'), 'KHUNG_GIO_KHONG_HOP_LE');
SELECT t.loi('Giờ trong quá khứ bị từ chối',
  format($q$SELECT dat_lich(%L, %L, %L, %L)$q$, t.get('pet1'), t.get('b1'), t.get('dv_kham'), t.slot(-1, 2)), 'KHUNG_GIO_KHONG_HOP_LE');
SELECT t.loi('Chủ nuôi không đặt xa hơn 30 ngày',
  format($q$SELECT dat_lich(%L, %L, %L, %L)$q$, t.get('pet1'), t.get('b1'), t.get('dv_kham'), t.slot(40, 2)), 'KHUNG_GIO_KHONG_HOP_LE');
SELECT t.loi('Tiêm phòng bắt buộc chọn vaccine',
  format($q$SELECT dat_lich(%L, %L, %L, %L)$q$, t.get('pet1'), t.get('b1'), t.get('dv_tiem'), t.slot(3, 4)), 'VACCINE_BAT_BUOC');
SELECT t.loi('Dịch vụ khám không được chọn vaccine',
  format($q$SELECT dat_lich(%L, %L, %L, %L, %L)$q$, t.get('pet1'), t.get('b1'), t.get('dv_kham'), t.slot(3, 4), t.get('vc')), 'VACCINE_KHONG_HOP_LE');
SELECT t.loi('Tiêm phòng mà chọn thuốc thường (không phải vaccine) bị từ chối',
  format($q$SELECT dat_lich(%L, %L, %L, %L, %L)$q$, t.get('pet1'), t.get('b1'), t.get('dv_tiem'), t.slot(3, 4), t.get('amox')), 'VACCINE_KHONG_HOP_LE');
SELECT t.loi('Dịch vụ không tồn tại',
  format($q$SELECT dat_lich(%L, %L, %L, %L)$q$, t.get('pet1'), t.get('b1'), gen_random_uuid(), t.slot(3, 4)), 'DICH_VU_KHONG_HOP_LE');
SELECT t.loi('Đặt cho tài khoản không phải bác sĩ bị từ chối',
  format($q$SELECT dat_lich(%L, %L, %L, %L)$q$, t.get('pet1'), t.get('kho'), t.get('dv_kham'), t.slot(3, 4)), 'KHUNG_GIO_KHONG_HOP_LE');

SELECT t.as_user('le_tan');
SELECT t.set('Lfar', dat_lich(t.u('pet1'), t.u('b1'), t.u('dv_kham'), t.slot(40, 2), NULL, 'Đặt xa')::text);
SELECT t.kt('Lễ tân đặt hộ: tự xác nhận và ghi người xác nhận',
  t.dem('lich_hen', format($$id = %L AND trang_thai = 'da_xac_nhan' AND nguoi_xac_nhan_id = %L$$, t.get('Lfar'), t.get('le_tan'))) = 1);
SELECT t.kt('Lễ tân không bị giới hạn đặt trước 30 ngày', t.dem('lich_hen', format('id = %L', t.get('Lfar'))) = 1);
SELECT t.set('Ltiem', dat_lich(t.u('pet1'), t.u('b2'), t.u('dv_tiem'), t.slot(3, 2), t.u('vc'), NULL)::text);
SELECT t.kt('Lịch tiêm lưu đúng vaccine',
  t.dem('lich_hen', format('id = %L AND vaccine_id = %L', t.get('Ltiem'), t.get('vc'))) = 1);

-- giới hạn số lịch chờ
SELECT t.as_user('admin');
UPDATE cau_hinh SET gia_tri = '2' WHERE khoa = 'gioi_han_lich_cho';
SELECT t.as_user('chu1');
SELECT t.loi('Vượt giới hạn số lịch chưa diễn ra',
  format($q$SELECT dat_lich(%L, %L, %L, %L)$q$, t.get('pet1'), t.get('b1'), t.get('dv_kham'), t.slot(3, 4)), 'VUOT_GIOI_HAN_LICH');
SELECT t.as_user('admin');
UPDATE cau_hinh SET gia_tri = '5' WHERE khoa = 'gioi_han_lich_cho';
SELECT t.as_user('chu1');
SELECT t.thanh_cong('Sau khi nới giới hạn, đặt lịch được',
  format($q$SELECT dat_lich(%L, %L, %L, %L)$q$, t.get('pet1'), t.get('b2'), t.get('dv_kham'), t.slot(3, 4)));
