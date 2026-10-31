import { execFileSync } from 'node:child_process';
import { TK } from './helpers.js';
import { dn, DV, chuanBiDuLieuDatLich } from './seed.js';
import { ok } from './api.js';

// Dữ liệu số lượng lớn, nạp thẳng vào CSDL THỬ bằng psql (đi qua giao diện hay hàm đặt lịch thì quá chậm vì có giới hạn 10 lần mỗi phút).
// Chạy lại nhiều lần vẫn an toàn: đã có khách "Khách Lớn" thì bỏ qua.
export const CO_DB = !!process.env.E2E_DB_URL;
export const SO = { khach: 250, cho: 120, thuNganChuaLap: 60, thuNganChuaThu: 70, thuNganDaThu: 70, thuCungChuNuoi: 80, hoaDonChuNuoi: 70, tienHd: 150000 };

export function psql(sql, bien = {}){
  const args = [process.env.E2E_DB_URL, '-v', 'ON_ERROR_STOP=1', '-q', '-t', '-A', '-f', '-'];
  for (const [k, v] of Object.entries(bien)) args.push('-v', `${k}=${v}`);
  return execFileSync('psql', args, { input: sql, encoding: 'utf8', maxBuffer: 1 << 24 }).trim();
}

export async function napDuLieuLon(){
  await chuanBiDuLieuDatLich();
  if (Number(psql(`SELECT count(*) FROM chu_nuoi WHERE ho_ten LIKE 'Khách Lớn %';`)) > 0) return;
  const bs = (await dn(TK.bac_si)).id, tn = (await dn(TK.thu_ngan)).id;
  const cnc = await dn(TK.chu_nuoi);
  const cn = ok(await cnc.c.from('chu_nuoi').select('id').limit(1), 'đọc hồ sơ chủ nuôi')[0].id;
  const dv = ok(await (await dn(TK.admin)).c.from('dich_vu').select('id').eq('ten', DV.ten), 'đọc dịch vụ')[0].id;
  psql(`
BEGIN;
INSERT INTO chu_nuoi (ho_ten, so_dien_thoai, dia_chi)
  SELECT 'Khách Lớn ' || lpad(i::text, 3, '0'), '0' || (900000000 + i)::text, 'Số ' || i || ' phố Thử' FROM generate_series(1, ${SO.khach}) i;
INSERT INTO thu_cung (chu_nuoi_id, ten, loai)
  SELECT id, 'Bé ' || right(ho_ten, 3), 'Chó' FROM chu_nuoi WHERE ho_ten LIKE 'Khách Lớn %';
INSERT INTO thu_cung (chu_nuoi_id, ten, loai)
  SELECT :'cn'::uuid, 'Thú Lớn ' || lpad(i::text, 3, '0'), 'Mèo' FROM generate_series(1, ${SO.thuCungChuNuoi}) i;

CREATE TEMP TABLE p AS
  SELECT t.id, row_number() OVER (ORDER BY t.ten, t.id) n FROM thu_cung t JOIN chu_nuoi c ON c.id = t.chu_nuoi_id WHERE c.ho_ten LIKE 'Khách Lớn %';
CREATE TEMP TABLE q AS
  SELECT id, row_number() OVER (ORDER BY ten) n FROM thu_cung WHERE chu_nuoi_id = :'cn'::uuid AND ten LIKE 'Thú Lớn %';

-- lịch chờ xác nhận, xa trong tương lai
INSERT INTO lich_hen (thu_cung_id, bac_si_id, dich_vu_id, thoi_gian, trang_thai, ghi_chu)
  SELECT id, :'bs'::uuid, :'dv'::uuid, date_trunc('day', now()) + interval '200 days' + n * interval '10 minutes', 'cho_xac_nhan', 'LON-CHO-' || n FROM p WHERE n <= ${SO.cho};

-- lịch đã khám trong 7 ngày qua cho thu ngân: nhóm 1 chưa lập hóa đơn, nhóm 2 chưa thu, nhóm 3 đã thu đủ
INSERT INTO lich_hen (thu_cung_id, bac_si_id, dich_vu_id, thoi_gian, trang_thai, ghi_chu)
  SELECT id, :'bs'::uuid, :'dv'::uuid, date_trunc('minute', now()) - n * interval '30 minutes' - interval '7 minutes', 'da_hoan_thanh', 'LON-TN-' || n
  FROM p WHERE n <= ${SO.thuNganChuaLap + SO.thuNganChuaThu + SO.thuNganDaThu};
INSERT INTO hoa_don (lich_hen_id, thu_ngan_id, tong_tien, trang_thai, created_at)
  SELECT l.id, :'tn'::uuid, ${SO.tienHd}, CASE WHEN n <= ${SO.thuNganChuaLap + SO.thuNganChuaThu} THEN 'chua_thanh_toan' ELSE 'da_thanh_toan' END, now() - n * interval '10 minutes'
  FROM (SELECT id, substring(ghi_chu from 8)::int n FROM lich_hen WHERE ghi_chu LIKE 'LON-TN-%') l WHERE n > ${SO.thuNganChuaLap};

-- hóa đơn cũ của chủ nuôi thử (quá 7 ngày, không ảnh hưởng thu ngân)
INSERT INTO lich_hen (thu_cung_id, bac_si_id, dich_vu_id, thoi_gian, trang_thai, ghi_chu)
  SELECT id, :'bs'::uuid, :'dv'::uuid, date_trunc('minute', now()) - (20 + n) * interval '1 day' - interval '3 minutes', 'da_hoan_thanh', 'LON-CN-' || n FROM q WHERE n <= ${SO.hoaDonChuNuoi};
INSERT INTO hoa_don (lich_hen_id, thu_ngan_id, tong_tien, trang_thai, created_at)
  SELECT id, :'tn'::uuid, ${SO.tienHd}, 'da_thanh_toan', now() - (20 + substring(ghi_chu from 8)::int) * interval '1 day' FROM lich_hen WHERE ghi_chu LIKE 'LON-CN-%';

INSERT INTO ct_hoa_don (hoa_don_id, mo_ta, so_luong, don_gia)
  SELECT h.id, 'Khám tổng quát E2E', 1, ${SO.tienHd} FROM hoa_don h JOIN lich_hen l ON l.id = h.lich_hen_id WHERE l.ghi_chu LIKE 'LON-%';
INSERT INTO thanh_toan (hoa_don_id, thu_ngan_id, so_tien, phuong_thuc, thoi_gian)
  SELECT h.id, :'tn'::uuid, ${SO.tienHd}, CASE WHEN random() < 0.5 THEN 'tien_mat' ELSE 'chuyen_khoan' END, h.created_at
  FROM hoa_don h JOIN lich_hen l ON l.id = h.lich_hen_id WHERE l.ghi_chu LIKE 'LON-%' AND h.trang_thai = 'da_thanh_toan';
COMMIT;`, { cn, bs, tn, dv });
}

export const so = chu => Number(String(chu).replace(/[^\d]/g, ''));
export const tongThu = (tu, den) => Number(psql(`SELECT coalesce(sum(so_tien),0) FROM thanh_toan WHERE (thoi_gian AT TIME ZONE 'Asia/Ho_Chi_Minh')::date BETWEEN '${tu}' AND '${den}';`));
