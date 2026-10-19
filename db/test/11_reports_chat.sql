-- Kiểm thử báo cáo doanh thu (admin) và trao đổi nội bộ. Chạy sau 10_behavior.sql (dùng lại dữ liệu và hàm t.*).
\set ON_ERROR_STOP off
\pset pager off
TRUNCATE t.kq;
\set a1 '''00000000-0000-0000-0000-0000000000a1'''
\set bs1 '''00000000-0000-0000-0000-0000000000b1'''
\set bs2 '''00000000-0000-0000-0000-0000000000b2'''
\set lt '''00000000-0000-0000-0000-0000000000c1'''
\set tn '''00000000-0000-0000-0000-0000000000d1'''
\set kho '''00000000-0000-0000-0000-0000000000e1'''
\set cn1 '''00000000-0000-0000-0000-0000000000f1'''
\set pet2 '''00000000-0000-0000-0000-0000000001f2'''
\set dvt '''00000000-0000-0000-0000-000000000d02'''

-- ===== BÁO CÁO DOANH THU =====
SET ROLE authenticated; SELECT t.as_(:a1);
SELECT t.bang('admin: doanh thu theo thang = 104000', 'SELECT sum(tong_thu)::text FROM doanh_thu_theo_thang(current_date-60,current_date+1)','104000');
SELECT t.bang('admin: theo thang chi 1 dong', 'SELECT count(*)::text FROM doanh_thu_theo_thang(current_date-60,current_date+1)','1');
SELECT t.bang('admin: tien mat 4000', 'SELECT sum(tien_mat)::text FROM doanh_thu_theo_thang(current_date-60,current_date+1)','4000');
SELECT t.bang('admin: chuyen khoan 100000', 'SELECT sum(chuyen_khoan)::text FROM doanh_thu_theo_thang(current_date-60,current_date+1)','100000');
SELECT t.bang('admin: theo dich vu - nhom Dich vu 100000', $$SELECT sum(tong_tien)::text FROM doanh_thu_theo_dich_vu(current_date-60,current_date+1) WHERE nhom='Dịch vụ'$$,'100000');
SELECT t.bang('admin: theo dich vu - nhom Thuoc 4000', $$SELECT sum(tong_tien)::text FROM doanh_thu_theo_dich_vu(current_date-60,current_date+1) WHERE nhom='Thuốc'$$,'4000');
SELECT t.bang('admin: tong theo dich vu = tong hoa don', 'SELECT sum(tong_tien)::text FROM doanh_thu_theo_dich_vu(current_date-60,current_date+1)','104000');
SELECT t.loi('khoang ngay dao nguoc', 'SELECT * FROM doanh_thu_theo_thang(current_date,current_date-1)','KHOANG_NGAY_KHONG_HOP_LE');
SELECT t.loi('khoang ngay NULL', 'SELECT * FROM doanh_thu_theo_dich_vu(NULL,current_date)','KHOANG_NGAY_KHONG_HOP_LE');
SELECT t.bang('ngoai khoang -> khong co dong', 'SELECT count(*)::text FROM doanh_thu_theo_thang(current_date-400,current_date-300)','0');
-- vai trò khác bị chặn
SELECT t.as_(:tn);
SELECT t.loi('thu ngan khong xem theo thang', 'SELECT * FROM doanh_thu_theo_thang(current_date-60,current_date)','KHONG_CO_QUYEN');
SELECT t.loi('thu ngan khong xem theo dich vu', 'SELECT * FROM doanh_thu_theo_dich_vu(current_date-60,current_date)','KHONG_CO_QUYEN');
SELECT t.ok('thu ngan van xem theo ngay', 'SELECT * FROM doanh_thu_theo_ngay(current_date-60,current_date)');
SELECT t.as_(:cn1);
SELECT t.loi('chu nuoi khong xem doanh thu thang', 'SELECT * FROM doanh_thu_theo_thang(current_date-60,current_date)','KHONG_CO_QUYEN');
SELECT t.as_(:bs1);
SELECT t.loi('bac si khong xem doanh thu dich vu', 'SELECT * FROM doanh_thu_theo_dich_vu(current_date-60,current_date)','KHONG_CO_QUYEN');
RESET ROLE;
SET ROLE anon; SELECT t.as_('');
SELECT t.loi('anon khong goi bao cao', 'SELECT * FROM doanh_thu_theo_thang(current_date-1,current_date)','42501');
SELECT t.loi('anon khong doc cong no', 'SELECT * FROM cong_no_hoa_don','42501');
RESET ROLE;

-- ===== CÔNG NỢ =====
-- Hoàn thành lịch tiêm của pet2 (dữ liệu dựng bằng postgres), admin lập hóa đơn 50000 rồi thu 20000
UPDATE lich_hen SET trang_thai='da_hoan_thanh' WHERE thu_cung_id=:pet2 AND dich_vu_id=:dvt AND trang_thai='da_xac_nhan' AND id=(SELECT id FROM lich_hen WHERE thu_cung_id=:pet2 AND dich_vu_id=:dvt AND trang_thai='da_xac_nhan' LIMIT 1);
SET ROLE authenticated; SELECT t.as_(:a1);
SELECT t.bang('cong no: chua co (hoa don da thu du)', 'SELECT count(*)::text FROM cong_no_hoa_don','0');
SELECT t.ok('admin lap hoa don tiem', format('SELECT lap_hoa_don((SELECT id FROM lich_hen WHERE thu_cung_id=%L AND trang_thai=%L LIMIT 1))',:pet2,'da_hoan_thanh'));
SELECT t.bang('cong no: 1 hoa don 200000 (dich vu 50000 + vaccine 150000)', 'SELECT con_no::text FROM cong_no_hoa_don','200000');
SELECT t.ok('thu mot phan 20000', $$SELECT ghi_thanh_toan((SELECT hoa_don_id FROM cong_no_hoa_don),20000,'tien_mat')$$);
SELECT t.bang('cong no: con 180000', 'SELECT con_no::text FROM cong_no_hoa_don','180000');
SELECT t.bang('cong no: da thu 20000', 'SELECT da_thu::text FROM cong_no_hoa_don','20000');
SELECT t.bang('cong no: co sdt chu nuoi', 'SELECT so_dien_thoai FROM cong_no_hoa_don','0901000002');
SELECT t.as_(:tn);
SELECT t.bang('thu ngan khong thay cong no', 'SELECT count(*)::text FROM cong_no_hoa_don','0');
SELECT t.as_(:cn1);
SELECT t.bang('chu nuoi khong thay cong no', 'SELECT count(*)::text FROM cong_no_hoa_don','0');
SELECT t.as_(:a1);
SELECT t.loi('thu vuot so con no', $$SELECT ghi_thanh_toan((SELECT hoa_don_id FROM cong_no_hoa_don),180001,'chuyen_khoan')$$,'VUOT_SO_TIEN_CON_LAI');
SELECT t.ok('thu not 180000', $$SELECT ghi_thanh_toan((SELECT hoa_don_id FROM cong_no_hoa_don),180000,'chuyen_khoan')$$);
SELECT t.bang('cong no: het sau khi thu du', 'SELECT count(*)::text FROM cong_no_hoa_don','0');
SELECT t.bang('doanh thu thang gio la 304000', 'SELECT sum(tong_thu)::text FROM doanh_thu_theo_thang(current_date-60,current_date+1)','304000');
RESET ROLE;

-- ===== TRAO ĐỔI NỘI BỘ =====
SET ROLE authenticated; SELECT t.as_(:bs1);
SELECT t.ok('bs1 gui tin vao luong cua minh', format('SELECT gui_tin_nhan(%L,%L)',:bs1,'Con vaccine Dai khong?'));
SELECT t.loi('bs1 khong gui vao luong bs2', format('SELECT gui_tin_nhan(%L,%L)',:bs2,'xin chao'),'KHONG_CO_QUYEN');
SELECT t.loi('tin rong', format('SELECT gui_tin_nhan(%L,%L)',:bs1,'   '),'NOI_DUNG_KHONG_HOP_LE');
SELECT t.loi('tin qua dai (1001 ky tu)', format('SELECT gui_tin_nhan(%L,%L)',:bs1,repeat('a',1001)),'NOI_DUNG_KHONG_HOP_LE');
SELECT t.ok('tin dung 1000 ky tu', format('SELECT gui_tin_nhan(%L,%L)',:bs1,repeat('b',1000)));
SELECT t.loi('khong sua tin truc tiep', 'UPDATE tin_nhan SET noi_dung=''x''','42501');
SELECT t.loi('khong xoa tin truc tiep', 'DELETE FROM tin_nhan','42501');
SELECT t.loi('khong insert tin truc tiep', format('INSERT INTO tin_nhan (nhan_vien_id,nguoi_gui_id,noi_dung) VALUES (%L,%L,%L)',:bs1,:bs1,'gia mao'),'42501');
SELECT t.bang('bs1 thay 2 tin', 'SELECT count(*)::text FROM tin_nhan','2');
SELECT t.as_(:a1);
SELECT t.ok('admin tra loi bs1', format('SELECT gui_tin_nhan(%L,%L)',:bs1,'Con 2 lieu, nhap them thu Hai'));
SELECT t.bang('admin thay 3 tin cua luong bs1', format('SELECT count(*)::text FROM tin_nhan WHERE nhan_vien_id=%L',:bs1),'3');
SELECT t.loi('admin khong gui vao luong chu nuoi', format('SELECT gui_tin_nhan(%L,%L)',:cn1,'xin chao'),'LUONG_KHONG_HOP_LE');
SELECT t.loi('admin khong gui vao luong chinh minh', format('SELECT gui_tin_nhan(%L,%L)',:a1,'xin chao'),'LUONG_KHONG_HOP_LE');
SELECT t.bang('admin: hop thu co >= 5 luong nhan vien', 'SELECT (count(*)>=5)::text FROM hop_thu_noi_bo','true');
SELECT t.bang('admin vua tra loi -> luong bs1 tinh la da doc', format('SELECT chua_doc::text FROM hop_thu_noi_bo WHERE nhan_vien_id=%L',:bs1),'0');
SELECT t.ok('admin danh dau da doc luong bs1', format('SELECT danh_dau_da_doc(%L)',:bs1));
SELECT t.bang('admin: luong bs1 het chua doc', format('SELECT chua_doc::text FROM hop_thu_noi_bo WHERE nhan_vien_id=%L',:bs1),'0');
SELECT t.loi('danh dau da doc luong khong ton tai', 'SELECT danh_dau_da_doc(gen_random_uuid())','LUONG_KHONG_HOP_LE');
SELECT t.as_(:bs1);
SELECT t.bang('bs1: chua doc = 1 (tin admin)', format('SELECT chua_doc::text FROM hop_thu_noi_bo WHERE nhan_vien_id=%L',:bs1),'1');
SELECT t.bang('bs1: hop thu chi thay luong cua minh', 'SELECT count(*)::text FROM hop_thu_noi_bo','1');
SELECT t.ok('bs1 danh dau da doc', format('SELECT danh_dau_da_doc(%L)',:bs1));
SELECT t.bang('bs1: het chua doc', format('SELECT chua_doc::text FROM hop_thu_noi_bo WHERE nhan_vien_id=%L',:bs1),'0');
SELECT t.loi('bs1 khong danh dau luong bs2', format('SELECT danh_dau_da_doc(%L)',:bs2),'KHONG_CO_QUYEN');
SELECT t.bang('bs1 khong thay moc doc cua admin', 'SELECT count(*)::text FROM doc_tin_nhan WHERE tai_khoan_id<>auth.uid()','0');
-- cô lập giữa nhân viên
SELECT t.as_(:bs2);
SELECT t.bang('bs2 khong thay tin cua bs1', 'SELECT count(*)::text FROM tin_nhan','0');
SELECT t.as_(:lt);
SELECT t.bang('le tan khong thay tin cua bs1', 'SELECT count(*)::text FROM tin_nhan','0');
SELECT t.ok('le tan gui tin cho admin', format('SELECT gui_tin_nhan(%L,%L)',:lt,'May in hong'));
SELECT t.as_(:a1);
SELECT t.bang('admin: luong le tan co 1 tin chua doc', format('SELECT chua_doc::text FROM hop_thu_noi_bo WHERE nhan_vien_id=%L',:lt),'1');
SELECT t.as_(:tn);
SELECT t.bang('thu ngan khong thay tin cua le tan', 'SELECT count(*)::text FROM tin_nhan','0');
-- chủ nuôi
SELECT t.as_(:cn1);
SELECT t.loi('chu nuoi khong gui tin noi bo', format('SELECT gui_tin_nhan(%L,%L)',:cn1,'cho hoi'),'KHONG_CO_QUYEN');
SELECT t.bang('chu nuoi khong doc tin', 'SELECT count(*)::text FROM tin_nhan','0');
SELECT t.bang('chu nuoi khong thay hop thu', 'SELECT count(*)::text FROM hop_thu_noi_bo','0');
RESET ROLE;
SET ROLE anon; SELECT t.as_('');
SELECT t.loi('anon khong doc tin nhan', 'SELECT * FROM tin_nhan','42501');
SELECT t.loi('anon khong goi gui_tin_nhan', format('SELECT gui_tin_nhan(%L,%L)',:bs1,'x'),'42501');
RESET ROLE;
-- bất biến với cả postgres
SELECT t.loi('tin nhan bat bien (sua)', 'UPDATE tin_nhan SET noi_dung=''x''','BAN_GHI_BAT_BIEN');
SELECT t.loi('tin nhan bat bien (xoa)', 'DELETE FROM tin_nhan','BAN_GHI_BAT_BIEN');
SELECT t.loi('tin nhan bat bien (truncate)', 'TRUNCATE tin_nhan','BAN_GHI_BAT_BIEN');
-- giới hạn tốc độ: 20 tin/phút/người gửi
SET ROLE authenticated; SELECT t.as_(:kho);
SELECT t.ok('kho gui 20 tin', format('SELECT gui_tin_nhan(%L,%L||g) FROM generate_series(1,20) g',:kho,'tin '));
SELECT t.loi('tin thu 21 bi chan', format('SELECT gui_tin_nhan(%L,%L)',:kho,'tin 21'),'QUA_NHIEU_TIN_NHAN');
RESET ROLE;
-- bảo trì
UPDATE cau_hinh SET gia_tri='true' WHERE khoa='che_do_bao_tri';
SET ROLE authenticated; SELECT t.as_(:bs1);
SELECT t.loi('bao tri: nhan vien khong gui tin', format('SELECT gui_tin_nhan(%L,%L)',:bs1,'x'),'HE_THONG_BAO_TRI');
SELECT t.bang('bao tri: nhan vien khong doc tin', 'SELECT count(*)::text FROM tin_nhan','0');
SELECT t.as_(:a1);
SELECT t.ok('bao tri: admin van nhan tin', format('SELECT gui_tin_nhan(%L,%L)',:bs1,'Dang bao tri'));
SELECT t.ok('bao tri: admin van xem bao cao', 'SELECT * FROM doanh_thu_theo_thang(current_date-60,current_date)');
RESET ROLE;
UPDATE cau_hinh SET gia_tri='false' WHERE khoa='che_do_bao_tri';
-- tài khoản bị khóa
UPDATE tai_khoan SET trang_thai='khoa' WHERE id=:lt;
SET ROLE authenticated; SELECT t.as_(:lt);
SELECT t.loi('tai khoan khoa khong gui tin', format('SELECT gui_tin_nhan(%L,%L)',:lt,'x'),'TAI_KHOAN_BI_KHOA');
SELECT t.bang('tai khoan khoa khong thay tin', 'SELECT count(*)::text FROM tin_nhan','0');
RESET ROLE;
UPDATE tai_khoan SET trang_thai='hoat_dong' WHERE id=:lt;

\echo ---KET QUA---
SELECT CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END AS kq, ten, chi_tiet FROM t.kq WHERE NOT ok ORDER BY 1;
SELECT count(*) FILTER (WHERE ok) AS pass, count(*) FILTER (WHERE NOT ok) AS fail FROM t.kq;
