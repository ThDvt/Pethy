-- Kiểm thử bảo mật: giới hạn tần suất, nhật ký xem hồ sơ, quét RLS/quyền. Chạy sau 10 và 11.
\set ON_ERROR_STOP off
\pset pager off
TRUNCATE t.kq;
\set a1 '''00000000-0000-0000-0000-0000000000a1'''
\set bs1 '''00000000-0000-0000-0000-0000000000b1'''
\set lt '''00000000-0000-0000-0000-0000000000c1'''
\set tn '''00000000-0000-0000-0000-0000000000d1'''
\set kho '''00000000-0000-0000-0000-0000000000e1'''
\set cn1 '''00000000-0000-0000-0000-0000000000f1'''
\set rl '''00000000-0000-0000-0000-0000000000f9'''
\set pet1 '''00000000-0000-0000-0000-0000000001f1'''
\set petrl '''00000000-0000-0000-0000-0000000001f9'''
\set dvk '''00000000-0000-0000-0000-000000000d01'''

-- ===== (1) GIỚI HẠN TẦN SUẤT =====
INSERT INTO auth.users (id,email,raw_user_meta_data) VALUES (:rl,'rl@x.vn','{"ho_ten":"Nguoi Thu","so_dien_thoai":"0912000099"}');
INSERT INTO thu_cung (id,chu_nuoi_id,ten,loai) VALUES (:petrl,(SELECT id FROM chu_nuoi WHERE tai_khoan_id=:rl),'Tho','tho');
SET ROLE authenticated; SELECT t.as_(:rl);
SELECT t.ok('xem gio trong 30 lan/phut van duoc', format('SELECT count(*) FROM generate_series(1,30) g, LATERAL khung_gio_trong(%L,hom_nay()+4+(g %% 2)) k',:bs1));
SELECT t.loi('lan thu 31 bi chan', format('SELECT * FROM khung_gio_trong(%L,hom_nay()+5)',:bs1),'QUA_NHIEU_YEU_CAU');
SELECT t.loi('dat_lich cung bi chan khi dang bi chan? (khong, rieng tung hanh dong)', format('SELECT dat_lich(%L,%L,%L,t.gio(20,9))',:petrl,:bs1,:dvk),'*') WHERE false;
SELECT t.ok('hanh dong khac van dung duoc (dat_lich)', format('SELECT dat_lich(%L,%L,%L,t.gio(20,9))',:petrl,:bs1,:dvk));
SELECT t.as_(:cn1);
SELECT t.ok('nguoi dung khac khong bi anh huong', format('SELECT * FROM khung_gio_trong(%L,hom_nay()+5)',:bs1));
SELECT t.as_(:lt);
SELECT t.ok('le tan khong bi gioi han (40 lan)', format('SELECT count(*) FROM generate_series(1,40) g, LATERAL khung_gio_trong(%L,hom_nay()+4+(g %% 2)) k',:bs1));
SELECT t.as_(:a1);
SELECT t.ok('admin khong bi gioi han (40 lan)', format('SELECT count(*) FROM generate_series(1,40) g, LATERAL khung_gio_trong(%L,hom_nay()+4+(g %% 2)) k',:bs1));
RESET ROLE;
-- sau khi cửa sổ 60 giây trôi qua thì gọi lại được
UPDATE gioi_han_goi SET thoi_gian = thoi_gian - interval '2 minutes';
SET ROLE authenticated; SELECT t.as_(:rl);
SELECT t.ok('het cua so -> goi lai duoc', format('SELECT * FROM khung_gio_trong(%L,hom_nay()+5)',:bs1));
-- đổi lịch qua lại tối đa 10 lần/phút
SELECT t.ok('doi lich 10 lan lien tiep', format($$SELECT doi_lich((SELECT id FROM lich_hen WHERE thu_cung_id=%L AND trang_thai<>'da_huy' LIMIT 1), t.gio(20, 10 + (g %% 2))) FROM generate_series(1,10) g$$,:petrl));
SELECT t.loi('doi lich lan thu 11 bi chan', format($$SELECT doi_lich((SELECT id FROM lich_hen WHERE thu_cung_id=%L AND trang_thai<>'da_huy' LIMIT 1), t.gio(20, 13))$$,:petrl),'QUA_NHIEU_YEU_CAU');
SELECT t.loi('khong doc bang dem truc tiep', 'SELECT * FROM gioi_han_goi','42501');
SELECT t.loi('khong ghi bang dem truc tiep', format('DELETE FROM gioi_han_goi'),'42501');
SELECT t.loi('khong goi _gioi_han truc tiep', $$SELECT _gioi_han('x',1,1)$$,'42501');
RESET ROLE;
SELECT t.bang('dong dem cu duoc don dep (>1 gio)', $$SELECT (count(*) FILTER (WHERE thoi_gian < now()-interval '1 hour'))::text FROM gioi_han_goi$$,'0');

-- ===== (2) NHẬT KÝ XEM HỒ SƠ =====
SELECT t.bang('truoc khi xem: chua co dong nhat ky xem', $$SELECT count(*)::text FROM nhat_ky WHERE hanh_dong='xem'$$,'0');
SET ROLE authenticated; SELECT t.as_(:bs1);
SELECT t.bang('bs khong doc truc tiep ho_so_kham', 'SELECT count(*)::text FROM ho_so_kham','0');
SELECT t.bang('bs khong doc truc tiep don_thuoc', 'SELECT count(*)::text FROM don_thuoc','0');
SELECT t.bang('bs khong doc truc tiep ct_don_thuoc', 'SELECT count(*)::text FROM ct_don_thuoc','0');
SELECT t.bang('bs xem ho so qua ham: co chan doan', format($$SELECT (xem_ho_so_kham(%L)::text LIKE '%%Viem da%%')::text$$,:pet1),'true');
SELECT t.bang('bs xem ho so qua ham: co don thuoc', format($$SELECT (xem_ho_so_kham(%L)::text LIKE '%%Amox%%')::text$$,:pet1),'true');
SELECT t.loi('xem thu cung khong ton tai', 'SELECT xem_ho_so_kham(gen_random_uuid())','THU_CUNG_KHONG_TON_TAI');
SELECT t.as_(:a1);
SELECT t.bang('admin cung khong doc truc tiep ho_so_kham', 'SELECT count(*)::text FROM ho_so_kham','0');
SELECT t.ok('admin xem qua ham', format('SELECT xem_ho_so_kham(%L)',:pet1));
SELECT t.bang('admin doc nhat ky: co 3 dong xem', $$SELECT count(*)::text FROM nhat_ky WHERE hanh_dong='xem'$$,'3');
SELECT t.bang('nhat ky ghi dung nguoi xem', format($$SELECT count(*)::text FROM nhat_ky WHERE hanh_dong='xem' AND tai_khoan_id=%L$$,:bs1),'2');
SELECT t.bang('nhat ky ghi dung thu cung', format($$SELECT count(*)::text FROM nhat_ky WHERE hanh_dong='xem' AND bang_tac_dong='ho_so_kham' AND ban_ghi_id=%L$$,:pet1),'3');
SELECT t.loi('nhat ky xem khong sua duoc', $$UPDATE nhat_ky SET hanh_dong='them' WHERE hanh_dong='xem'$$,'42501');
SELECT t.as_(:lt);
SELECT t.loi('le tan khong goi xem_ho_so_kham', format('SELECT xem_ho_so_kham(%L)',:pet1),'KHONG_CO_QUYEN');
SELECT t.as_(:tn);
SELECT t.loi('thu ngan khong goi xem_ho_so_kham', format('SELECT xem_ho_so_kham(%L)',:pet1),'KHONG_CO_QUYEN');
SELECT t.as_(:kho);
SELECT t.loi('thu kho khong goi xem_ho_so_kham', format('SELECT xem_ho_so_kham(%L)',:pet1),'KHONG_CO_QUYEN');
SELECT t.as_(:cn1);
SELECT t.loi('chu nuoi khong goi xem_ho_so_kham', format('SELECT xem_ho_so_kham(%L)',:pet1),'KHONG_CO_QUYEN');
SELECT t.bang('chu nuoi van doc truc tiep ho so cua minh', 'SELECT (count(*)>0)::text FROM ho_so_kham','true');
SELECT t.bang('chu nuoi van doc truc tiep don thuoc cua minh', 'SELECT (count(*)>0)::text FROM ct_don_thuoc','true');
RESET ROLE;
SELECT t.bang('chu nuoi xem ho so cua minh khong ghi nhat ky', $$SELECT count(*)::text FROM nhat_ky WHERE hanh_dong='xem'$$,'3');
SET ROLE anon; SELECT t.as_('');
SELECT t.loi('anon khong goi xem_ho_so_kham', format('SELECT xem_ho_so_kham(%L)',:pet1),'42501');
RESET ROLE;
UPDATE cau_hinh SET gia_tri='true' WHERE khoa='che_do_bao_tri';
SET ROLE authenticated; SELECT t.as_(:bs1);
SELECT t.loi('bao tri: bac si khong xem duoc ho so', format('SELECT xem_ho_so_kham(%L)',:pet1),'HE_THONG_BAO_TRI');
SELECT t.as_(:a1);
SELECT t.ok('bao tri: admin van xem', format('SELECT xem_ho_so_kham(%L)',:pet1));
RESET ROLE;
UPDATE cau_hinh SET gia_tri='false' WHERE khoa='che_do_bao_tri';

-- ===== (3) QUÉT RLS VÀ QUYỀN: bảng mới thêm sau này sẽ làm các kiểm tra này đỏ nếu quên cấu hình =====
SELECT t.bang('moi bang public deu bat RLS (liet ke bang thieu)',
  $$SELECT coalesce(string_agg(c.relname, ',' ORDER BY c.relname),'') FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p') AND NOT c.relrowsecurity$$,'');
SELECT t.bang('so bang public (dem de phat hien bang moi)',
  $$SELECT count(*)::text FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p')$$,'23');
SELECT t.bang('khach (anon) chi co quyen voi 3 doi tuong cong khai',
  $$SELECT coalesce(string_agg(c.relname, ',' ORDER BY c.relname),'') FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m') AND (has_any_column_privilege('anon', c.oid, 'SELECT,INSERT,UPDATE,REFERENCES') OR has_table_privilege('anon', c.oid, 'DELETE,TRUNCATE,TRIGGER'))$$,
  'bac_si_cong_khai,cau_hinh,dich_vu');
SELECT t.bang('nguoi dang nhap chi ghi truc tiep duoc 8 bang danh muc/ho so',
  $$SELECT coalesce(string_agg(c.relname, ',' ORDER BY c.relname),'') FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m') AND (has_any_column_privilege('authenticated', c.oid, 'INSERT,UPDATE') OR has_table_privilege('authenticated', c.oid, 'DELETE,TRUNCATE,TRIGGER'))$$,
  'cau_hinh,chu_nuoi,dich_vu,ho_so_bac_si,lich_lam_viec,tai_khoan,thu_cung,thuoc');
SELECT t.bang('chi lich_lam_viec cho xoa truc tiep',
  $$SELECT coalesce(string_agg(c.relname, ',' ORDER BY c.relname),'') FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m') AND has_table_privilege('authenticated', c.oid, 'DELETE,TRUNCATE')$$,
  'lich_lam_viec');
SELECT t.bang('moi ham SECURITY DEFINER deu co search_path co dinh (liet ke ham thieu)',
  $$SELECT coalesce(string_agg(p.proname, ',' ORDER BY p.proname),'') FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.prosecdef AND NOT EXISTS (SELECT 1 FROM unnest(coalesce(p.proconfig,'{}')) cfg WHERE cfg LIKE 'search_path=%')$$,'');
SELECT t.bang('khach chi goi duoc 3 ham ho tro',
  $$SELECT coalesce(string_agg(p.proname, ',' ORDER BY p.proname),'') FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND has_function_privilege('anon', p.oid, 'EXECUTE')$$,
  'cau_hinh_so,hom_nay,vai_tro_hieu_luc');
SELECT t.bang('khong ham noi bo (_...) nao goi duoc tu trinh duyet',
  $$SELECT coalesce(string_agg(p.proname, ',' ORDER BY p.proname),'') FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname LIKE '\_%' AND has_function_privilege('authenticated', p.oid, 'EXECUTE')$$,'');
SELECT t.bang('ham trigger khong goi duoc tu trinh duyet',
  $$SELECT coalesce(string_agg(p.proname, ',' ORDER BY p.proname),'') FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.prorettype='trigger'::regtype AND (has_function_privilege('authenticated', p.oid, 'EXECUTE') OR has_function_privilege('anon', p.oid, 'EXECUTE'))$$,'');
-- view chạy bằng quyền chủ sở hữu: kiểm tra từng view nhạy cảm không lộ hàng cho người không có quyền
SET ROLE authenticated; SELECT t.as_(:cn1);
SELECT t.bang('chu nuoi: ton_kho_lo trong', 'SELECT count(*)::text FROM ton_kho_lo','0');
SELECT t.bang('chu nuoi: ton_kho_thuoc trong', 'SELECT count(*)::text FROM ton_kho_thuoc','0');
SELECT t.bang('chu nuoi: canh_bao_kho trong', 'SELECT count(*)::text FROM canh_bao_kho','0');
SELECT t.bang('chu nuoi: lich_can_nhac trong', 'SELECT count(*)::text FROM lich_can_nhac','0');
SELECT t.bang('chu nuoi: cong_no_hoa_don trong', 'SELECT count(*)::text FROM cong_no_hoa_don','0');
SELECT t.bang('chu nuoi: hop_thu_noi_bo trong', 'SELECT count(*)::text FROM hop_thu_noi_bo','0');
SELECT t.as_(:tn);
SELECT t.bang('thu ngan: canh_bao_kho trong (chi admin, thu kho)', 'SELECT count(*)::text FROM canh_bao_kho','0');
SELECT t.bang('thu ngan: lich_can_nhac trong (chi le tan, admin)', 'SELECT count(*)::text FROM lich_can_nhac','0');
RESET ROLE;

\echo ---KET QUA---
SELECT CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END AS kq, ten, chi_tiet FROM t.kq WHERE NOT ok ORDER BY 1;
SELECT count(*) FILTER (WHERE ok) AS pass, count(*) FILTER (WHERE NOT ok) AS fail FROM t.kq;
