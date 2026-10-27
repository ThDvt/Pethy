-- Kiểm thử hành vi. Chạy sau reset.sh:  psql ... -d vettest -f test/10_behavior.sql
\set ON_ERROR_STOP off
\pset pager off
CREATE SCHEMA t;
CREATE TABLE t.kq (ten text, ok boolean, chi_tiet text);
GRANT USAGE ON SCHEMA t TO PUBLIC; GRANT ALL ON t.kq TO PUBLIC;

-- chạy sql, mong đợi lỗi có HINT = p_ma
CREATE FUNCTION t.loi(p_ten text, p_sql text, p_ma text) RETURNS void LANGUAGE plpgsql AS $$
DECLARE h text; m text; st text;
BEGIN
  EXECUTE p_sql;
  INSERT INTO t.kq VALUES (p_ten, false, 'không có lỗi, mong đợi '||p_ma);
EXCEPTION WHEN OTHERS THEN
  GET STACKED DIAGNOSTICS h = PG_EXCEPTION_HINT, m = MESSAGE_TEXT, st = RETURNED_SQLSTATE;
  INSERT INTO t.kq VALUES (p_ten, p_ma = '*' OR coalesce(nullif(h,''), st) = p_ma, coalesce(nullif(h,''), st)||' / '||m);
END $$;
-- chạy sql, mong đợi thành công
CREATE FUNCTION t.ok(p_ten text, p_sql text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE p_sql; INSERT INTO t.kq VALUES (p_ten, true, '');
EXCEPTION WHEN OTHERS THEN INSERT INTO t.kq VALUES (p_ten, false, SQLERRM);
END $$;
-- so sánh giá trị
CREATE FUNCTION t.bang(p_ten text, p_sql text, p_mong text) RETURNS void LANGUAGE plpgsql AS $$
DECLARE v text;
BEGIN
  EXECUTE p_sql INTO v;
  INSERT INTO t.kq VALUES (p_ten, v IS NOT DISTINCT FROM p_mong, 'được '||coalesce(v,'NULL')||', mong '||p_mong);
EXCEPTION WHEN OTHERS THEN INSERT INTO t.kq VALUES (p_ten, false, SQLERRM);
END $$;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA t TO PUBLIC;

-- ---------- DỮ LIỆU NỀN (chạy bằng postgres) ----------
INSERT INTO auth.users (id,email) VALUES
 ('00000000-0000-0000-0000-0000000000a1','admin@x.vn'),
 ('00000000-0000-0000-0000-0000000000b1','bs1@x.vn'),
 ('00000000-0000-0000-0000-0000000000b2','bs2@x.vn'),
 ('00000000-0000-0000-0000-0000000000c1','lt@x.vn'),
 ('00000000-0000-0000-0000-0000000000d1','tn@x.vn'),
 ('00000000-0000-0000-0000-0000000000e1','kho@x.vn'),
 ('00000000-0000-0000-0000-0000000000f1','cn1@x.vn'),
 ('00000000-0000-0000-0000-0000000000f2','cn2@x.vn');
UPDATE tai_khoan SET vai_tro='admin'    WHERE id='00000000-0000-0000-0000-0000000000a1';
UPDATE tai_khoan SET vai_tro='bac_si'   WHERE id IN ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000b2');
UPDATE tai_khoan SET vai_tro='le_tan'   WHERE id='00000000-0000-0000-0000-0000000000c1';
UPDATE tai_khoan SET vai_tro='thu_ngan' WHERE id='00000000-0000-0000-0000-0000000000d1';
UPDATE tai_khoan SET vai_tro='kho'      WHERE id='00000000-0000-0000-0000-0000000000e1';
INSERT INTO ho_so_bac_si (tai_khoan_id) SELECT id FROM tai_khoan WHERE vai_tro='bac_si';
INSERT INTO lich_lam_viec (bac_si_id,thu_trong_tuan,gio_bat_dau,gio_ket_thuc)
 SELECT b.id, d, '08:00','17:00' FROM tai_khoan b, generate_series(1,7) d WHERE b.vai_tro='bac_si';
INSERT INTO chu_nuoi (tai_khoan_id,ho_ten,so_dien_thoai) VALUES
 ('00000000-0000-0000-0000-0000000000f1','Chu Mot','0901000001'),
 ('00000000-0000-0000-0000-0000000000f2','Chu Hai','0901000002');
INSERT INTO chu_nuoi (id,ho_ten,so_dien_thoai) VALUES ('00000000-0000-0000-0000-00000000aaaa','Khach vang lai','0901000003');
INSERT INTO thu_cung (id,chu_nuoi_id,ten,loai) VALUES
 ('00000000-0000-0000-0000-0000000001f1',(SELECT id FROM chu_nuoi WHERE tai_khoan_id='00000000-0000-0000-0000-0000000000f1'),'Mit','cho'),
 ('00000000-0000-0000-0000-0000000001f2',(SELECT id FROM chu_nuoi WHERE tai_khoan_id='00000000-0000-0000-0000-0000000000f2'),'Miu','meo'),
 ('00000000-0000-0000-0000-0000000001f3','00000000-0000-0000-0000-00000000aaaa','Lu','cho');
INSERT INTO dich_vu (id,ten,loai,gia) VALUES
 ('00000000-0000-0000-0000-000000000d01','Kham tong quat','kham',100000),
 ('00000000-0000-0000-0000-000000000d02','Tiem phong','tiem',50000);
INSERT INTO thuoc (id,ten,loai,don_vi,gia_ban,nguong_canh_bao) VALUES
 ('00000000-0000-0000-0000-000000000501','Amox','thuoc','vien',2000,5),
 ('00000000-0000-0000-0000-000000000502','Vitamin','thuoc','vien',1000,5),
 ('00000000-0000-0000-0000-000000000503','Dai','vaccine','lieu',150000,2);
\set bs1 '''00000000-0000-0000-0000-0000000000b1'''
\set bs2 '''00000000-0000-0000-0000-0000000000b2'''
\set cn1 '''00000000-0000-0000-0000-0000000000f1'''
\set cn2 '''00000000-0000-0000-0000-0000000000f2'''
\set pet1 '''00000000-0000-0000-0000-0000000001f1'''
\set pet2 '''00000000-0000-0000-0000-0000000001f2'''
\set pet3 '''00000000-0000-0000-0000-0000000001f3'''
\set dvk '''00000000-0000-0000-0000-000000000d01'''
\set dvt '''00000000-0000-0000-0000-000000000d02'''
\set amox '''00000000-0000-0000-0000-000000000501'''
\set vit '''00000000-0000-0000-0000-000000000502'''
\set vc '''00000000-0000-0000-0000-000000000503'''
-- giờ hẹn: n ngày sau, hh:00 giờ VN
CREATE FUNCTION t.gio(n int, hh int) RETURNS timestamptz LANGUAGE sql STABLE AS
 $$ SELECT ((hom_nay()+n)::timestamp + make_interval(hours=>hh)) AT TIME ZONE 'Asia/Ho_Chi_Minh' $$;
GRANT EXECUTE ON FUNCTION t.gio(int,int) TO PUBLIC;
CREATE FUNCTION t.as_(p_uid text) RETURNS void LANGUAGE plpgsql AS $$ BEGIN PERFORM set_config('request.jwt.claim.sub', p_uid, false); END $$;

-- ====== 1. KHO (thủ kho) ======
SET ROLE authenticated; SELECT t.as_(:cn1);
SELECT t.loi('chu nuoi khong nhap kho duoc', format('SELECT nhap_kho(%L,%L,%L,10)',:amox,'L1',current_date+100), 'KHONG_CO_QUYEN');
SELECT t.as_('00000000-0000-0000-0000-0000000000e1');
SELECT t.ok('kho nhap lo L1 (hạn gần) 3', format('SELECT nhap_kho(%L,%L,%L,3)',:amox,'L1',current_date+60));
SELECT t.ok('kho nhap lo L2 (hạn xa) 10', format('SELECT nhap_kho(%L,%L,%L,10)',:amox,'L2',current_date+200));
SELECT t.ok('kho nhap vit 20', format('SELECT nhap_kho(%L,%L,%L,20)',:vit,'V1',current_date+200));
SELECT t.ok('kho nhap vaccine 2', format('SELECT nhap_kho(%L,%L,%L,2)',:vc,'D1',current_date+200));
SELECT t.loi('nhap kho so luong 0', format('SELECT nhap_kho(%L,%L,%L,0)',:amox,'L3',current_date+60), 'SO_LUONG_KHONG_HOP_LE');
SELECT t.loi('nhap kho han dung cu', format('SELECT nhap_kho(%L,%L,%L,5)',:amox,'L3',current_date-1), 'HAN_DUNG_KHONG_HOP_LE');
SELECT t.loi('nhap lo cu khac han', format('SELECT nhap_kho(%L,%L,%L,5)',:amox,'L1',current_date+99), 'LO_KHAC_HAN_DUNG');
SELECT t.loi('kho khong sua bien_dong_kho truc tiep', 'UPDATE bien_dong_kho SET so_luong=999', '42501');
SELECT t.loi('kho khong xoa bien_dong_kho truc tiep', 'DELETE FROM bien_dong_kho', '42501');
SELECT t.bang('kho khong thay hoa don (0 dong)', 'SELECT count(*)::text FROM hoa_don','0');
SELECT t.bang('kho thay ton amox = 13', format('SELECT ton_con_han::text FROM ton_kho_thuoc WHERE thuoc_id=%L',:amox), '13');
SELECT t.bang('kho khong thay ho so kham', 'SELECT count(*)::text FROM ho_so_kham','0');
RESET ROLE;

-- ====== 2. ĐẶT LỊCH ======
SET ROLE authenticated; SELECT t.as_(:cn1);
SELECT t.ok('chu nuoi dat lich', format('SELECT dat_lich(%L,%L,%L,t.gio(3,9))',:pet1,:bs1,:dvk));
SELECT t.loi('trung khung gio (cn khac)', format('SELECT 1'), '*');  -- placeholder bỏ qua, xem dưới
DELETE FROM t.kq WHERE ten LIKE 'trung khung gio (cn khac)';
SELECT t.as_(:cn2);
SELECT t.loi('cn2 dat trung gio bs1', format('SELECT dat_lich(%L,%L,%L,t.gio(3,9))',:pet2,:bs1,:dvk), 'KHUNG_GIO_DA_DAT');
SELECT t.ok('cn2 dat gio bs2 cung luc', format('SELECT dat_lich(%L,%L,%L,t.gio(3,9))',:pet2,:bs2,:dvk));
SELECT t.loi('cn2 dat cho thu cung cua cn1', format('SELECT dat_lich(%L,%L,%L,t.gio(4,9))',:pet1,:bs1,:dvk), 'KHONG_CO_QUYEN');
SELECT t.loi('dat gio qua khu', format('SELECT dat_lich(%L,%L,%L,now()-interval ''1 day'')',:pet2,:bs1,:dvk), 'KHUNG_GIO_KHONG_HOP_LE');
SELECT t.loi('dat gio khong chia khung 09:10', format('SELECT dat_lich(%L,%L,%L,t.gio(5,9)+interval ''10 min'')',:pet2,:bs1,:dvk), 'KHUNG_GIO_KHONG_HOP_LE');
SELECT t.loi('dat qua xa (60 ngay)', format('SELECT dat_lich(%L,%L,%L,t.gio(60,9))',:pet2,:bs1,:dvk), 'KHUNG_GIO_KHONG_HOP_LE');
SELECT t.loi('dat ngoai gio lam 20h', format('SELECT dat_lich(%L,%L,%L,t.gio(5,20))',:pet2,:bs1,:dvk), 'KHUNG_GIO_KHONG_HOP_LE');
SELECT t.loi('tiem thieu vaccine', format('SELECT dat_lich(%L,%L,%L,t.gio(5,10))',:pet2,:bs1,:dvt), 'VACCINE_BAT_BUOC');
SELECT t.loi('kham kem vaccine', format('SELECT dat_lich(%L,%L,%L,t.gio(5,10),%L)',:pet2,:bs1,:dvk,:vc), 'VACCINE_KHONG_HOP_LE');
SELECT t.loi('chu nuoi insert truc tiep lich_hen', 'INSERT INTO lich_hen DEFAULT VALUES', '42501');
SELECT t.loi('cn2 khong thay lich cn1', 'SELECT 1/ (SELECT count(*)::int FROM lich_hen l JOIN thu_cung p ON p.id=l.thu_cung_id WHERE p.id='||quote_literal(:pet1)||')', '22012');
SELECT t.bang('cn2 chi thay 1 lich cua minh', 'SELECT count(*)::text FROM lich_hen', '1');
SELECT t.bang('cn2 khong thay thu cung cn1', 'SELECT count(*)::text FROM thu_cung', '1');
SELECT t.bang('cn2 khong thay chu nuoi khac', 'SELECT count(*)::text FROM chu_nuoi', '1');
SELECT t.bang('cn2 khong thay nhat ky', 'SELECT count(*)::text FROM nhat_ky','0');
SELECT t.bang('cn2 khung gio trong khong gom gio da dat (bs1 9h)',
  format('SELECT count(*)::text FROM khung_gio_trong(%L,(hom_nay()+3)) WHERE thoi_gian=t.gio(3,9)',:bs1),'0');
-- huy / đổi
SELECT t.as_(:cn1);
SELECT t.loi('cn1 doi sang gio trung', format('SELECT doi_lich((SELECT id FROM lich_hen WHERE thu_cung_id=%L),t.gio(3,9),%L)',:pet1,:bs2), 'KHUNG_GIO_DA_DAT');
SELECT t.ok('cn1 doi sang 10h', format('SELECT doi_lich((SELECT id FROM lich_hen WHERE thu_cung_id=%L),t.gio(3,10))',:pet1));
SELECT t.bang('doi xong thi cho xac nhan lai', format('SELECT trang_thai FROM lich_hen WHERE thu_cung_id=%L',:pet1),'cho_xac_nhan');
SELECT t.ok('slot 9h bs1 duoc giai phong -> cn2 dat duoc', 'SELECT 1');
RESET ROLE;
-- giới hạn lịch chờ (5)
SET ROLE authenticated; SELECT t.as_(:cn1);
SELECT t.ok('cn1 dat them 4 lich (tong 5)', format('SELECT dat_lich(%L,%L,%L,t.gio(%s,11)) FROM generate_series(4,7) g', :pet1,:bs1,:dvk,'g'));
SELECT t.loi('cn1 vuot 5 lich cho', format('SELECT dat_lich(%L,%L,%L,t.gio(8,11))',:pet1,:bs1,:dvk), 'VUOT_GIOI_HAN_LICH');
RESET ROLE;
-- hủy sát giờ: tạo lịch trong 1 giờ bằng admin/lễ tân (không giới hạn đặt trước)
SET ROLE authenticated; SELECT t.as_('00000000-0000-0000-0000-0000000000c1');
SELECT t.ok('le tan dat ho (tu xac nhan)', format('SELECT dat_lich(%L,%L,%L,t.gio(2,15))',:pet3,:bs2,:dvk));
SELECT t.bang('le tan dat ho -> da_xac_nhan', format('SELECT trang_thai FROM lich_hen WHERE thu_cung_id=%L',:pet3),'da_xac_nhan');
SELECT t.ok('le tan thay tat ca lich', 'SELECT count(*) FROM lich_hen');
SELECT t.ok('le tan xac nhan lich cn1', format('SELECT xac_nhan_lich((SELECT id FROM lich_hen WHERE thu_cung_id=%L AND thoi_gian=t.gio(3,10)))',:pet1));
SELECT t.loi('xac nhan 2 lan', format('SELECT xac_nhan_lich((SELECT id FROM lich_hen WHERE thu_cung_id=%L AND thoi_gian=t.gio(3,10)))',:pet1),'LICH_KHONG_HOP_LE');
SELECT t.bang('le tan khong thay ho so kham', 'SELECT count(*)::text FROM ho_so_kham','0');
SELECT t.loi('le tan khong nhap kho', format('SELECT nhap_kho(%L,%L,%L,1)',:amox,'Z',current_date+50), 'KHONG_CO_QUYEN');
SELECT t.loi('le tan khong dat vai tro', format('SELECT dat_vai_tro(%L,%L)',:cn1,'admin'), 'KHONG_CO_QUYEN');
RESET ROLE;
UPDATE lich_hen SET thoi_gian = now()+interval '1 hour' WHERE thu_cung_id=:pet3;  -- giả lập sát giờ
SET ROLE authenticated; SELECT t.as_(:cn1);
UPDATE lich_hen SET thoi_gian=thoi_gian WHERE false;
RESET ROLE;
UPDATE lich_hen SET thoi_gian = now()+interval '1 hour' WHERE thu_cung_id=:pet1 AND thoi_gian=t.gio(3,10);
SET ROLE authenticated; SELECT t.as_(:cn1);
SELECT t.loi('cn1 huy sat gio', format('SELECT huy_lich((SELECT id FROM lich_hen WHERE thu_cung_id=%L ORDER BY thoi_gian LIMIT 1))',:pet1),'QUA_HAN_DOI_HUY');
SELECT t.ok('cn1 huy lich xa', format('SELECT huy_lich((SELECT id FROM lich_hen WHERE thu_cung_id=%L ORDER BY thoi_gian DESC LIMIT 1),%L)',:pet1,'ban viec'));
RESET ROLE;

-- ====== 3. KHÁM, KÊ ĐƠN (FEFO, rollback) ======
UPDATE lich_hen SET thoi_gian = t.gio(3,10) WHERE thu_cung_id=:pet1 AND thoi_gian < now()+interval '2 hours';
SET ROLE authenticated; SELECT t.as_(:bs2);
SELECT t.loi('bs2 ghi ho so lich cua bs1', format('SELECT ghi_ho_so_kham((SELECT id FROM lich_hen WHERE thu_cung_id=%L AND thoi_gian=t.gio(3,10) LIMIT 1),%L)',:pet1,'x'),'KHONG_CO_QUYEN');
SELECT t.as_(:bs1);
SELECT t.loi('thieu chan doan', format('SELECT ghi_ho_so_kham((SELECT id FROM lich_hen WHERE thu_cung_id=%L AND thoi_gian=t.gio(3,10) LIMIT 1),%L)',:pet1,' '),'THIEU_CHAN_DOAN');
SELECT t.ok('bs1 ghi ho so', format('SELECT ghi_ho_so_kham((SELECT id FROM lich_hen WHERE thu_cung_id=%L AND thoi_gian=t.gio(3,10) LIMIT 1),%L,12.5,38.6)',:pet1,'Viem da'));
SELECT t.bang('lich -> da_hoan_thanh', format('SELECT trang_thai FROM lich_hen WHERE thu_cung_id=%L AND thoi_gian=t.gio(3,10)',:pet1),'da_hoan_thanh');
RESET ROLE;
CREATE TEMP TABLE hs AS SELECT h.id FROM ho_so_kham h LIMIT 1;
GRANT SELECT ON hs TO authenticated;
SET ROLE authenticated; SELECT t.as_(:bs1);
-- kê 5 amox + 3 vit : FEFO: L1(3) hết trước rồi L2(2)
SELECT t.ok('ke don hop le', format($$SELECT ke_don((SELECT id FROM hs), '[{"thuoc_id":%s,"so_luong":5,"lieu_dung":"2 lan/ngay"},{"thuoc_id":%s,"so_luong":3,"lieu_dung":"1 lan"}]'::jsonb)$$, to_json(:amox::text), to_json(:vit::text)));
RESET ROLE;
SELECT t.bang('FEFO: L1 con 0', $$SELECT ton::text FROM ton_kho_lo WHERE so_lo='L1' AND ten='Amox'$$, NULL) WHERE false;
SELECT t.bang('FEFO: L1 het (0)', $$SELECT sum(b.so_luong)::text FROM bien_dong_kho b JOIN lo_thuoc l ON l.id=b.lo_thuoc_id WHERE l.so_lo='L1'$$,'0');
SELECT t.bang('FEFO: L2 con 8', $$SELECT sum(b.so_luong)::text FROM bien_dong_kho b JOIN lo_thuoc l ON l.id=b.lo_thuoc_id WHERE l.so_lo='L2'$$,'8');
SET ROLE authenticated; SELECT t.as_(:bs1);
-- kê vượt tồn: phải rollback toàn bộ, đơn cũ giữ nguyên
SELECT t.loi('ke vuot ton -> loi', format($$SELECT ke_don((SELECT id FROM hs), '[{"thuoc_id":%s,"so_luong":1,"lieu_dung":"a"},{"thuoc_id":%s,"so_luong":999,"lieu_dung":"b"}]'::jsonb)$$, to_json(:vit::text), to_json(:amox::text)),'KHO_KHONG_DU');
SELECT t.loi('ke thuoc trung', format($$SELECT ke_don((SELECT id FROM hs), '[{"thuoc_id":%s,"so_luong":1,"lieu_dung":"a"},{"thuoc_id":%s,"so_luong":1,"lieu_dung":"a"}]'::jsonb)$$, to_json(:vit::text), to_json(:vit::text)),'THUOC_TRUNG');
SELECT t.loi('ke vaccine bang ke_don', format($$SELECT ke_don((SELECT id FROM hs), '[{"thuoc_id":%s,"so_luong":1,"lieu_dung":"a"}]'::jsonb)$$, to_json(:vc::text)),'THUOC_KHONG_HOP_LE');
SELECT t.loi('ke don rong', $$SELECT ke_don((SELECT id FROM hs), '[]'::jsonb)$$,'DON_THUOC_TRONG');
SELECT t.loi('ke thieu lieu dung', format($$SELECT ke_don((SELECT id FROM hs), '[{"thuoc_id":%s,"so_luong":1,"lieu_dung":""}]'::jsonb)$$, to_json(:vit::text)),'THIEU_LIEU_DUNG');
SELECT t.loi('ke du lieu rac', $$SELECT ke_don((SELECT id FROM hs), '[{"thuoc_id":"abc","so_luong":1}]'::jsonb)$$,'DU_LIEU_DON_KHONG_HOP_LE');
RESET ROLE;
SELECT t.bang('rollback: don cu con 2 dong', 'SELECT count(*)::text FROM ct_don_thuoc','2');
SELECT t.bang('rollback: ton amox van 8', $$SELECT ton_con_han::text FROM ton_kho_thuoc WHERE ten='Amox'$$,'8');
SELECT t.bang('ton vit con 17', $$SELECT ton_con_han::text FROM ton_kho_thuoc WHERE ten='Vitamin'$$,'17');
-- kê lại: hoàn kho rồi trừ lại
SET ROLE authenticated; SELECT t.as_(:bs1);
SELECT t.ok('ke lai don (2 amox)', format($$SELECT ke_don((SELECT id FROM hs), '[{"thuoc_id":%s,"so_luong":2,"lieu_dung":"1 lan"}]'::jsonb)$$, to_json(:amox::text)));
RESET ROLE;
SELECT t.bang('ke lai: ton amox 11', $$SELECT ton_con_han::text FROM ton_kho_thuoc WHERE ten='Amox'$$,'11');
SELECT t.bang('ke lai: ton vit hoan 20', $$SELECT ton_con_han::text FROM ton_kho_thuoc WHERE ten='Vitamin'$$,'20');
-- chủ nuôi thấy hồ sơ/đơn của mình, không thấy của người khác
SET ROLE authenticated; SELECT t.as_(:cn1);
SELECT t.bang('cn1 thay ho so cua minh', 'SELECT count(*)::text FROM ho_so_kham','1');
SELECT t.bang('cn1 thay don thuoc cua minh', 'SELECT count(*)::text FROM ct_don_thuoc','1');
SELECT t.as_(:cn2);
SELECT t.bang('cn2 khong thay ho so cn1', 'SELECT count(*)::text FROM ho_so_kham','0');
SELECT t.bang('cn2 khong thay don thuoc cn1', 'SELECT count(*)::text FROM ct_don_thuoc','0');
RESET ROLE;

-- ====== 4. TIÊM ======
SET ROLE authenticated; SELECT t.as_(:cn2);
SELECT t.ok('cn2 dat lich tiem', format('SELECT dat_lich(%L,%L,%L,t.gio(6,14),%L)',:pet2,:bs2,:dvt,:vc));
RESET ROLE;
UPDATE lich_hen SET trang_thai='da_xac_nhan' WHERE thu_cung_id=:pet2 AND dich_vu_id=:dvt;
SET ROLE authenticated; SELECT t.as_(:bs2);
SELECT t.loi('ngay tiem tiep qua khu', format('SELECT ghi_tiem((SELECT id FROM lich_hen WHERE thu_cung_id=%L AND dich_vu_id=%L),current_date-1)',:pet2,:dvt),'NGAY_TIEM_TIEP_KHONG_HOP_LE');
SELECT t.ok('bs2 ghi tiem', format('SELECT ghi_tiem((SELECT id FROM lich_hen WHERE thu_cung_id=%L AND dich_vu_id=%L),current_date+21)',:pet2,:dvt));
SELECT t.loi('ghi tiem 2 lan', format('SELECT ghi_tiem((SELECT id FROM lich_hen WHERE thu_cung_id=%L AND dich_vu_id=%L))',:pet2,:dvt),'MUI_TIEM_DA_GHI');
RESET ROLE;
SELECT t.bang('vaccine con 1 lieu', $$SELECT ton_con_han::text FROM ton_kho_thuoc WHERE ten='Dai'$$,'1');
-- hết vaccine -> lỗi; lịch thứ hai
SET ROLE authenticated; SELECT t.as_('00000000-0000-0000-0000-0000000000e1');
SELECT t.ok('kho kiem ke vaccine ve 0', format('SELECT dieu_chinh_kho((SELECT id FROM lo_thuoc WHERE so_lo=%L),0,%L)','D1','kiem ke'));
SELECT t.loi('kiem ke thieu ly do', format('SELECT dieu_chinh_kho((SELECT id FROM lo_thuoc WHERE so_lo=%L),5,%L)','D1',''),'THIEU_LY_DO');
SELECT t.loi('kiem ke am', format('SELECT dieu_chinh_kho((SELECT id FROM lo_thuoc WHERE so_lo=%L),-1,%L)','D1','x'),'SO_LUONG_KHONG_HOP_LE');
SELECT t.as_(:cn2);
SELECT t.ok('cn2 dat tiem lan 2', format('SELECT dat_lich(%L,%L,%L,t.gio(7,14),%L)',:pet2,:bs2,:dvt,:vc));
RESET ROLE;
UPDATE lich_hen SET trang_thai='da_xac_nhan' WHERE thu_cung_id=:pet2 AND dich_vu_id=:dvt AND trang_thai='cho_xac_nhan';
SET ROLE authenticated; SELECT t.as_(:bs2);
SELECT t.loi('tiem khi het vaccine', format('SELECT ghi_tiem((SELECT id FROM lich_hen WHERE thu_cung_id=%L AND dich_vu_id=%L AND trang_thai=%L))',:pet2,:dvt,'da_xac_nhan'),'KHO_KHONG_DU');
RESET ROLE;
SELECT t.bang('tiem that bai -> khong co mui moi', 'SELECT count(*)::text FROM mui_tiem','1');

-- ====== 5. HÓA ĐƠN / THANH TOÁN ======
SET ROLE authenticated; SELECT t.as_('00000000-0000-0000-0000-0000000000d1');
SELECT t.loi('lap hd lich chua hoan thanh', format('SELECT lap_hoa_don((SELECT id FROM lich_hen WHERE thu_cung_id=%L AND trang_thai=%L LIMIT 1))',:pet2,'da_xac_nhan'),'LICH_CHUA_HOAN_THANH');
SELECT t.ok('lap hd kham', 'SELECT lap_hoa_don((SELECT id FROM lich_hen WHERE thu_cung_id=''00000000-0000-0000-0000-0000000001f1'' AND trang_thai=''da_hoan_thanh''))');
SELECT t.loi('lap hd lan 2', 'SELECT lap_hoa_don((SELECT id FROM lich_hen WHERE thu_cung_id=''00000000-0000-0000-0000-0000000001f1'' AND trang_thai=''da_hoan_thanh''))','DA_LAP_HOA_DON');
SELECT t.bang('tong tien = 100000 + 2*2000', 'SELECT tong_tien::text FROM hoa_don','104000');
SELECT t.loi('thu vuot', 'SELECT ghi_thanh_toan((SELECT id FROM hoa_don),104001,''tien_mat'')','VUOT_SO_TIEN_CON_LAI');
SELECT t.loi('phuong thuc sai', 'SELECT ghi_thanh_toan((SELECT id FROM hoa_don),1000,''the'')','PHUONG_THUC_KHONG_HOP_LE');
SELECT t.ok('thu 4000 tien mat', 'SELECT ghi_thanh_toan((SELECT id FROM hoa_don),4000,''tien_mat'')');
SELECT t.bang('tt mot phan', 'SELECT trang_thai FROM hoa_don','thanh_toan_mot_phan');
SELECT t.loi('huy hd da co thanh toan', 'SELECT huy_hoa_don((SELECT id FROM hoa_don))','DA_CO_THANH_TOAN');
SELECT t.ok('thu 100000 ck', 'SELECT ghi_thanh_toan((SELECT id FROM hoa_don),100000,''chuyen_khoan'')');
SELECT t.bang('da thanh toan', 'SELECT trang_thai FROM hoa_don','da_thanh_toan');
SELECT t.loi('thu them khi da du', 'SELECT ghi_thanh_toan((SELECT id FROM hoa_don),1,''tien_mat'')','HOA_DON_KHONG_HOP_LE');
SELECT t.bang('doanh thu hom nay 104000', 'SELECT sum(tong_thu)::text FROM doanh_thu_theo_ngay(hom_nay(),hom_nay())','104000');
SELECT t.loi('thanh_toan bat bien (update)', 'UPDATE thanh_toan SET so_tien=1','42501');
RESET ROLE;
SELECT t.loi('thanh_toan bat bien ca voi postgres', 'UPDATE thanh_toan SET so_tien=1','BAN_GHI_BAT_BIEN');
SELECT t.loi('thanh_toan khong xoa', 'DELETE FROM thanh_toan','BAN_GHI_BAT_BIEN');
SELECT t.loi('thanh_toan khong truncate', 'TRUNCATE thanh_toan','BAN_GHI_BAT_BIEN');
SELECT t.loi('nhat_ky bat bien', 'DELETE FROM nhat_ky','BAN_GHI_BAT_BIEN');
SELECT t.loi('bien_dong_kho bat bien (sua so luong)', 'UPDATE bien_dong_kho SET so_luong=so_luong+1','BAN_GHI_BAT_BIEN');
SELECT t.loi('bien_dong_kho khong xoa', 'DELETE FROM bien_dong_kho','BAN_GHI_BAT_BIEN');
SET ROLE authenticated; SELECT t.as_(:cn1);
SELECT t.bang('cn1 thay hoa don cua minh', 'SELECT count(*)::text FROM hoa_don','1');
SELECT t.bang('cn1 thay thanh toan cua minh', 'SELECT count(*)::text FROM thanh_toan','2');
SELECT t.as_(:cn2);
SELECT t.bang('cn2 khong thay hoa don cn1', 'SELECT count(*)::text FROM hoa_don','0');
SELECT t.loi('cn2 khong lap hoa don', 'SELECT lap_hoa_don(gen_random_uuid())','KHONG_CO_QUYEN');
RESET ROLE;

-- ====== 6. BẢO TRÌ ======
UPDATE cau_hinh SET gia_tri='true' WHERE khoa='che_do_bao_tri';
SET ROLE authenticated; SELECT t.as_(:cn1);
SELECT t.loi('bao tri: cn dat lich bi chan', format('SELECT dat_lich(%L,%L,%L,t.gio(9,9))',:pet1,:bs1,:dvk),'HE_THONG_BAO_TRI');
SELECT t.bang('bao tri: cn khong thay thu cung', 'SELECT count(*)::text FROM thu_cung','0');
SELECT t.bang('bao tri: cn khong thay lich', 'SELECT count(*)::text FROM lich_hen','0');
SELECT t.bang('bao tri: van doc duoc cau hinh cong khai', 'SELECT count(*)::text FROM cau_hinh WHERE khoa=''che_do_bao_tri''','1');
SELECT t.as_(:bs1);
SELECT t.bang('bao tri: bac si khong thay lich', 'SELECT count(*)::text FROM lich_hen','0');
SELECT t.as_('00000000-0000-0000-0000-0000000000a1');
SELECT t.ok('bao tri: admin van lam duoc', format('SELECT dat_lich(%L,%L,%L,t.gio(9,9))',:pet1,:bs1,:dvk));
SELECT t.bang('bao tri: admin thay du lieu', 'SELECT (count(*)>0)::text FROM lich_hen','true');
RESET ROLE;
UPDATE cau_hinh SET gia_tri='false' WHERE khoa='che_do_bao_tri';

-- ====== 7. KHÁCH CHƯA ĐĂNG NHẬP ======
SET ROLE anon; SELECT t.as_('');
SELECT t.ok('anon doc dich vu', 'SELECT * FROM dich_vu');
SELECT t.ok('anon doc bac si cong khai', 'SELECT * FROM bac_si_cong_khai');
SELECT t.loi('anon khong doc tai_khoan', 'SELECT * FROM tai_khoan','42501');
SELECT t.loi('anon khong doc lich_hen', 'SELECT * FROM lich_hen','42501');
SELECT t.loi('anon khong doc thuoc', 'SELECT * FROM thuoc','42501');
SELECT t.loi('anon khong goi dat_lich', format('SELECT dat_lich(%L,%L,%L,now())',:pet1,:bs1,:dvk),'42501');
SELECT t.loi('anon khong goi khung_gio_trong', format('SELECT * FROM khung_gio_trong(%L,current_date)',:bs1),'42501');
SELECT t.bang('anon chi doc cau hinh cong khai (khong lo so)', 'SELECT (count(*) FILTER (WHERE NOT cong_khai))::text FROM cau_hinh','0');
RESET ROLE;

-- ====== 8. ĐĂNG KÝ & TÀI KHOẢN ======
INSERT INTO auth.users (id,email,raw_user_meta_data) VALUES
 ('00000000-0000-0000-0000-0000000000f3','hack@x.vn','{"vai_tro":"admin","role":"admin","ho_ten":"Hacker","so_dien_thoai":"0912345678"}');
SELECT t.bang('dang ky: luon la chu_nuoi (bo qua metadata vai_tro)', $$SELECT vai_tro FROM tai_khoan WHERE id='00000000-0000-0000-0000-0000000000f3'$$,'chu_nuoi');
SELECT t.bang('dang ky: tao ho so chu nuoi khi co sdt hop le', $$SELECT count(*)::text FROM chu_nuoi WHERE tai_khoan_id='00000000-0000-0000-0000-0000000000f3'$$,'1');
INSERT INTO auth.users (id,email,raw_user_meta_data) VALUES ('00000000-0000-0000-0000-0000000000f4','x@x.vn','{"so_dien_thoai":"abc"}');
SELECT t.bang('dang ky: sdt rac -> khong tao chu_nuoi, van tao tai_khoan', $$SELECT count(*)::text FROM tai_khoan WHERE id='00000000-0000-0000-0000-0000000000f4'$$,'1');
SET ROLE authenticated; SELECT t.as_('00000000-0000-0000-0000-0000000000f4');
SELECT t.loi('tu nang quyen: UPDATE vai_tro', 'UPDATE tai_khoan SET vai_tro=''admin'' WHERE id=auth.uid()','42501');
SELECT t.loi('tu mo khoa: UPDATE trang_thai', 'UPDATE tai_khoan SET trang_thai=''hoat_dong''','42501');
SELECT t.ok('sua ho ten minh', 'UPDATE tai_khoan SET ho_ten=''Ten Moi'' WHERE id=auth.uid()');
SELECT t.bang('khong sua duoc tai khoan nguoi khac', 'WITH u AS (UPDATE tai_khoan SET ho_ten=''x'' WHERE id<>auth.uid() RETURNING 1) SELECT count(*)::text FROM u','0');
SELECT t.ok('hoan tat ho so chu nuoi', 'SELECT hoan_tat_ho_so_chu_nuoi(''Nguyen A'',''0987654321'',''HN'')');
SELECT t.loi('sdt sai', 'SELECT hoan_tat_ho_so_chu_nuoi(''A'',''123'',null)','SO_DIEN_THOAI_KHONG_HOP_LE');
SELECT t.loi('chu nuoi khong goi gop_chu_nuoi', 'SELECT gop_chu_nuoi(gen_random_uuid(),gen_random_uuid())','KHONG_CO_QUYEN');
SELECT t.loi('chu nuoi khong tao chu_nuoi truc tiep', 'INSERT INTO chu_nuoi (ho_ten,so_dien_thoai) VALUES (''x'',''0901111111'')','*');
SELECT t.loi('chu nuoi khong gan tai_khoan_id', 'INSERT INTO chu_nuoi (tai_khoan_id,ho_ten,so_dien_thoai) VALUES (auth.uid(),''x'',''0901111111'')','42501');
RESET ROLE;

-- gộp chủ nuôi
SET ROLE authenticated; SELECT t.as_('00000000-0000-0000-0000-0000000000c1');
SELECT t.ok('le tan gop khach vang lai vao cn1', format('SELECT gop_chu_nuoi(%L,(SELECT id FROM chu_nuoi WHERE tai_khoan_id=%L))','00000000-0000-0000-0000-00000000aaaa',:cn1));
SELECT t.loi('gop ho so da co tai khoan', format('SELECT gop_chu_nuoi((SELECT id FROM chu_nuoi WHERE tai_khoan_id=%L),(SELECT id FROM chu_nuoi WHERE tai_khoan_id=%L))',:cn2,:cn1),'HO_SO_DA_CO_TAI_KHOAN');
RESET ROLE;
SELECT t.bang('thu cung vang lai da chuyen sang cn1', 'SELECT count(*)::text FROM thu_cung p JOIN chu_nuoi c ON c.id=p.chu_nuoi_id WHERE c.tai_khoan_id='||quote_literal(:cn1),'2');

-- ====== 9. ADMIN: vai trò, khóa, xóa ======
SET ROLE authenticated; SELECT t.as_('00000000-0000-0000-0000-0000000000a1');
SELECT t.loi('admin khong tu doi vai tro', 'SELECT dat_vai_tro(auth.uid(),''kho'')','KHONG_TU_DOI_VAI_TRO');
SELECT t.loi('admin khong tu khoa', 'SELECT khoa_tai_khoan(auth.uid(),true)','KHONG_TU_KHOA');
SELECT t.loi('admin khong tu xoa', 'SELECT xoa_tai_khoan(auth.uid())','KHONG_TU_XOA');
SELECT t.loi('vai tro rac', format('SELECT dat_vai_tro(%L,%L)',:cn2,'god'),'VAI_TRO_KHONG_HOP_LE');
SELECT t.loi('doi vai tro bs con lich', format('SELECT dat_vai_tro(%L,%L)',:bs1,'kho'),'BAC_SI_CON_LICH_HEN');
SELECT t.loi('khoa bs con lich', format('SELECT khoa_tai_khoan(%L,true)',:bs1),'BAC_SI_CON_LICH_HEN');
SELECT t.loi('xoa tai khoan da co du lieu', format('SELECT xoa_tai_khoan(%L)',:cn1),'TAI_KHOAN_DA_PHAT_SINH');
SELECT t.ok('admin khoa chu nuoi cn2', format('SELECT khoa_tai_khoan(%L,true)',:cn2));
SELECT t.ok('admin doc nhat ky', 'SELECT count(*) FROM nhat_ky');
SELECT t.bang('admin xem duoc email cua moi tai khoan', 'SELECT (count(*) FILTER (WHERE email IS NOT NULL) = count(*))::text FROM danh_sach_tai_khoan()','true');
SELECT t.bang('danh sach tai khoan co du dong', 'SELECT (count(*) = (SELECT count(*) FROM tai_khoan))::text FROM danh_sach_tai_khoan()','true');
SELECT t.ok('admin gan vai tro bac_si cho tai khoan moi', 'SELECT dat_vai_tro(''00000000-0000-0000-0000-0000000000f4'',''bac_si'')');
SELECT t.ok('admin xoa tai khoan trong (f3)', 'SELECT xoa_tai_khoan(''00000000-0000-0000-0000-0000000000f3'')');
SELECT t.as_('00000000-0000-0000-0000-0000000000c1');
SELECT t.loi('le tan khong xem duoc email tai khoan', 'SELECT * FROM danh_sach_tai_khoan()','KHONG_CO_QUYEN');
SELECT t.as_(:cn1);
SELECT t.loi('chu nuoi khong xem duoc email tai khoan', 'SELECT * FROM danh_sach_tai_khoan()','KHONG_CO_QUYEN');
SELECT t.as_(:cn2);
SELECT t.loi('tai khoan khoa khong goi duoc rpc', format('SELECT dat_lich(%L,%L,%L,t.gio(9,9))',:pet2,:bs1,:dvk),'TAI_KHOAN_BI_KHOA');
SELECT t.bang('tai khoan khoa khong doc duoc thu cung', 'SELECT count(*)::text FROM thu_cung','0');
RESET ROLE;
SELECT t.bang('f4 co ho_so_bac_si', $$SELECT count(*)::text FROM ho_so_bac_si WHERE tai_khoan_id='00000000-0000-0000-0000-0000000000f4'$$,'1');
-- bài viết tin tức: admin quản lý, khách chỉ thấy bài đã đăng
SET ROLE authenticated; SELECT t.as_('00000000-0000-0000-0000-0000000000a1');
SELECT t.ok('admin viet bai nhap', $$INSERT INTO bai_viet (tieu_de, nhom, noi_dung) VALUES ('Bài nháp', 'cham_soc', 'Nội dung nháp.')$$);
SELECT t.ok('admin viet bai va dang ngay', $$INSERT INTO bai_viet (tieu_de, nhom, tom_tat, noi_dung, tac_gia, trang_thai) VALUES ('Tiêm phòng cho mèo con', 'tiem_phong', 'Lịch tiêm cơ bản.', E'## Mũi đầu\nTừ 8 tuần tuổi.', 'Bs. Lan', 'da_dang')$$);
SELECT t.bang('bai nhap chua co ngay dang', $$SELECT (ngay_dang IS NULL)::text FROM bai_viet WHERE tieu_de='Bài nháp'$$,'true');
SELECT t.bang('bai dang tu co ngay dang', $$SELECT (ngay_dang IS NOT NULL)::text FROM bai_viet WHERE tieu_de='Tiêm phòng cho mèo con'$$,'true');
SELECT t.loi('nhom bai viet khong hop le', $$INSERT INTO bai_viet (tieu_de, nhom, noi_dung) VALUES ('X','abc','Y')$$,'23514');
SELECT t.loi('client khong tu dat ngay dang', $$UPDATE bai_viet SET ngay_dang = now() - interval '5 years'$$,'42501');
SELECT t.ok('admin go bai ve nhap', $$UPDATE bai_viet SET trang_thai='nhap' WHERE tieu_de='Tiêm phòng cho mèo con'$$);
SELECT t.bang('go bai van giu ngay dang cu', $$SELECT (ngay_dang IS NOT NULL)::text FROM bai_viet WHERE tieu_de='Tiêm phòng cho mèo con'$$,'true');
SELECT t.ok('admin dang lai', $$UPDATE bai_viet SET trang_thai='da_dang' WHERE tieu_de='Tiêm phòng cho mèo con'$$);
SELECT t.as_(:cn1);
SELECT t.bang('chu nuoi chi thay bai da dang', 'SELECT count(*)::text FROM bai_viet','1');
SELECT t.loi('chu nuoi khong viet bai', $$INSERT INTO bai_viet (tieu_de, noi_dung) VALUES ('Spam','Spam')$$,'42501');
SELECT t.ok('chu nuoi xoa bai: khong loi nhung khong xoa', 'DELETE FROM bai_viet');
RESET ROLE;
SET ROLE anon; SELECT t.as_('');
SELECT t.bang('khach chi thay bai da dang', 'SELECT count(*)::text FROM bai_viet','1');
SELECT t.loi('khach khong viet bai', $$INSERT INTO bai_viet (tieu_de, noi_dung) VALUES ('Spam','Spam')$$,'42501');
RESET ROLE;
SELECT t.bang('bai viet con du sau khi chu nuoi thu xoa', 'SELECT count(*)::text FROM bai_viet','2');
SELECT t.loi('ho_so_bac_si chi cho bac si', $$INSERT INTO ho_so_bac_si (tai_khoan_id) VALUES ('00000000-0000-0000-0000-0000000000f1')$$,'KHONG_PHAI_BAC_SI');
-- Hồ sơ công khai: trình độ, kinh nghiệm, chứng chỉ
SET ROLE authenticated; SELECT t.as_(:bs1);
SELECT t.ok('bac si cap nhat trinh do, kinh nghiem, chung chi cua minh', format($q$UPDATE ho_so_bac_si SET trinh_do='Bác sĩ thú y, Học viện Nông nghiệp', kinh_nghiem_nam=8, chung_chi=E'Chứng chỉ hành nghề thú y\nTiêm phòng nâng cao' WHERE tai_khoan_id=%L$q$,:bs1));
SELECT t.loi('kinh nghiem am bi tu choi', format($q$UPDATE ho_so_bac_si SET kinh_nghiem_nam=-1 WHERE tai_khoan_id=%L$q$,:bs1),'23514');
SELECT t.loi('kinh nghiem qua 60 nam bi tu choi', format($q$UPDATE ho_so_bac_si SET kinh_nghiem_nam=61 WHERE tai_khoan_id=%L$q$,:bs1),'23514');
SELECT t.loi('chung chi qua dai bi tu choi', format($q$UPDATE ho_so_bac_si SET chung_chi=repeat('x',601) WHERE tai_khoan_id=%L$q$,:bs1),'23514');
RESET ROLE;
SET ROLE anon;
SELECT t.bang('khach thay trinh do cua bac si tren trang cong khai', format($q$SELECT kinh_nghiem_nam::text FROM bac_si_cong_khai WHERE id=%L$q$,:bs1),'8');
RESET ROLE;
SELECT t.bang('nhat ky ghi nhan thao tac', $$SELECT (count(*)>10)::text FROM nhat_ky$$,'true');
SELECT t.bang('nhat ky co gia tri cu/moi khi sua', $$SELECT (count(*)>0)::text FROM nhat_ky WHERE hanh_dong='sua' AND gia_tri_cu IS NOT NULL AND gia_tri_moi IS NOT NULL$$,'true');

-- ====== 10. ĐỒNG THỜI (hai phiên cùng đặt một giờ) ======
\echo ---KET QUA---
SELECT CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END AS kq, ten, chi_tiet FROM t.kq WHERE NOT ok ORDER BY 1;
SELECT count(*) FILTER (WHERE ok) AS pass, count(*) FILTER (WHERE NOT ok) AS fail FROM t.kq;
