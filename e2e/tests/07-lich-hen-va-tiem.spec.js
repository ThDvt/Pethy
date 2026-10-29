import { test, expect, TK, KHU, dangNhap, ngCanhMoi } from '../helpers.js';
import { chuanBiDuLieuTiem, tonKho, DV, DV_TIEM, VACCINE } from '../seed.js';
import { ngayVN, themThuCung, dienDatLich } from '../luong.js';

const mo = async (browser, tk, khu) => { const c = await ngCanhMoi(browser); const p = await c.newPage(); await dangNhap(p, tk, khu); return { c, p }; };
const tenMoi = tien => tien + Date.now().toString().slice(-6);

test('lễ tân tạo khách trực tiếp, thêm thú cưng, đặt lịch hộ: lịch được xác nhận luôn', async ({ browser }) => {
  test.setTimeout(120_000);
  await chuanBiDuLieuTiem();
  const khach = 'Khách E2E ' + Date.now().toString().slice(-5), pet = tenMoi('Bông'), sdt = '09' + Date.now().toString().slice(-8);
  const lt = await mo(browser, TK.le_tan, KHU.le_tan), bs = await mo(browser, TK.bac_si, KHU.bac_si);
  try {
    const p = lt.p;
    await p.goto('/le-tan/khach-hang.html');
    await p.getByRole('button', { name: 'Thêm khách mới' }).click();
    // số điện thoại sai thì bị chặn, đúng thì tạo được
    await p.locator('#k-t').fill(khach);
    await p.locator('#k-d').fill('123');
    await p.locator('#hop').getByRole('button', { name: 'Thêm', exact: true }).click();
    await expect(p.locator('#hop .loi')).toBeVisible();
    await p.locator('#k-d').fill(sdt);
    await p.locator('#hop').getByRole('button', { name: 'Thêm', exact: true }).click();
    await expect(p.locator('#hop')).not.toBeVisible();

    await p.locator('#tim').fill(khach);
    const dong = p.locator('.hang', { hasText: khach });
    await expect(dong).toHaveCount(1);
    await expect(dong).toContainText('Khách trực tiếp');
    await dong.getByRole('button', { name: 'Mở' }).click();
    await p.getByRole('button', { name: 'Thêm thú cưng' }).click();
    await p.locator('#p-t').fill(pet);
    await p.locator('#p-l').fill('Mèo');
    await p.locator('#hop').getByRole('button', { name: 'Thêm', exact: true }).click();
    await expect(p.locator('#hop')).toContainText(pet);
    await p.locator('#hop').locator('.hang', { hasText: pet }).getByRole('link', { name: 'Đặt lịch' }).click();
    await p.waitForURL(/dat-lich\.html\?thu_cung=/);

    await dienDatLich(p, { dv: DV.ten, bs: TK.bac_si.ten, ngay: ngayVN(4) });
    await expect(p.locator('#tieu-de')).toHaveText('Đã đặt lịch hộ khách');

    // bác sĩ thấy lịch đã xác nhận ngay, không phải chờ
    await bs.p.reload();
    const ds = bs.p.locator('#ds .hang', { hasText: pet });
    await expect(ds).toHaveCount(1);
    await expect(ds.getByRole('link', { name: 'Khám' })).toBeVisible();
  } finally { await lt.c.close(); await bs.c.close(); }
});

test('chủ nuôi đổi giờ rồi hủy lịch; lịch bị hủy không còn trong danh sách', async ({ browser }) => {
  test.setTimeout(120_000);
  await chuanBiDuLieuTiem();
  const pet = tenMoi('Lu');
  const cn = await mo(browser, TK.chu_nuoi, KHU.chu_nuoi);
  try {
    const p = cn.p;
    await themThuCung(p, pet);
    await p.goto('/chu-nuoi/dat-lich.html');
    const gio1 = await dienDatLich(p, { pet, dv: DV.ten, bs: TK.bac_si.ten, ngay: ngayVN(5) });
    await expect(p.locator('#tieu-de')).toHaveText('Đã gửi yêu cầu đặt lịch');

    await p.goto('/chu-nuoi/');
    const lich = p.locator('.lich', { hasText: pet });
    await expect(lich).toHaveCount(1);
    await expect(lich).toContainText(gio1);
    await expect(lich).toContainText('Chờ xác nhận');

    // đổi sang giờ cuối ngày
    await lich.getByRole('link', { name: 'Đổi lịch' }).click();
    await p.waitForURL(/dat-lich\.html\?doi=/);
    await p.locator('#ngay').fill(ngayVN(5));
    const nut = p.locator('#gio-box .tg button');
    await expect(nut.first()).toBeVisible();
    const gio2 = (await nut.last().textContent()).trim();
    await nut.last().click();
    await p.getByRole('button', { name: 'Đổi sang giờ này' }).click();
    await expect(p.locator('#tieu-de')).toHaveText('Đã đổi lịch');
    await p.goto('/chu-nuoi/');
    await expect(p.locator('.lich', { hasText: pet })).toContainText(gio2);

    // hủy kèm lý do
    await p.locator('.lich', { hasText: pet }).getByRole('button', { name: 'Hủy lịch' }).click();
    await p.locator('#ly-do').fill('Bận việc đột xuất');
    await p.locator('#huy-xn').click();
    await expect(p.locator('.lich', { hasText: pet })).toHaveCount(0);
  } finally { await cn.c.close(); }
});

test('tiêm vaccine: đặt lịch, lễ tân xác nhận, bác sĩ ghi mũi tiêm (trừ 1 liều), hóa đơn có vaccine, chủ nuôi thấy ngày tiêm tiếp theo', async ({ browser }) => {
  test.setTimeout(180_000);
  const { vaccineId } = await chuanBiDuLieuTiem();
  const pet = tenMoi('Tom'), ton0 = await tonKho(vaccineId), tiep = ngayVN(60);
  const cn = await mo(browser, TK.chu_nuoi, KHU.chu_nuoi), lt = await mo(browser, TK.le_tan, KHU.le_tan);
  const bs = await mo(browser, TK.bac_si, KHU.bac_si), tn = await mo(browser, TK.thu_ngan, KHU.thu_ngan);
  try {
    await themThuCung(cn.p, pet, 'Mèo');
    await cn.p.goto('/chu-nuoi/dat-lich.html');
    await dienDatLich(cn.p, { pet, dv: DV_TIEM.ten, vaccine: VACCINE.ten, bs: TK.bac_si.ten, ngay: ngayVN(6) });
    await expect(cn.p.locator('#tieu-de')).toHaveText('Đã gửi yêu cầu đặt lịch');

    await lt.p.reload();                                                     // trang lễ tân mở từ trước khi khách đặt
    const cho = lt.p.locator('#ds-cho .hang', { hasText: pet });
    await expect(cho).toHaveCount(1);
    await cho.getByRole('button', { name: 'Xác nhận' }).click();
    await expect(lt.p.locator('#ds-cho .hang', { hasText: pet })).toHaveCount(0);

    await bs.p.reload();
    await bs.p.locator('#ds .hang', { hasText: pet }).getByRole('link', { name: 'Khám' }).click();
    await bs.p.waitForURL(/kham\.html\?lich=/);
    await expect(bs.p.locator('#vc')).toHaveValue(/.+/);                     // vaccine khách chọn được chọn sẵn
    await bs.p.locator('#nt').fill(tiep);
    await bs.p.getByRole('button', { name: 'Ghi mũi tiêm' }).click();
    await bs.p.waitForURL(u => u.pathname === '/bac-si/' || u.pathname === '/bac-si/index.html', { timeout: 20_000 });
    expect(await tonKho(vaccineId)).toBe(ton0 - 1);

    await tn.p.reload();                                                     // trang thu ngân mở từ trước khi lịch hoàn thành
    const lap = tn.p.locator('#ds-lap .hang', { hasText: pet });
    await expect(lap).toHaveCount(1);
    await lap.getByRole('button', { name: 'Lập hóa đơn' }).click();
    const hop = tn.p.locator('#hop');
    await expect(hop).toContainText(DV_TIEM.ten);
    await expect(hop).toContainText(VACCINE.ten);
    await expect(hop).toContainText(/150[.,]000/);                           // 50.000 dịch vụ + 100.000 vaccine
    await hop.getByRole('button', { name: 'Ghi nhận thu tiền' }).click();
    await expect(tn.p.locator('#ds-xong .hang', { hasText: pet })).toHaveCount(1);

    await cn.p.goto('/chu-nuoi/');
    await expect(cn.p.locator('#ds-tiem')).toContainText(`Tiêm ${VACCINE.ten} cho ${pet}`);
  } finally { for (const x of [cn, lt, bs, tn]) await x.c.close(); }
});
