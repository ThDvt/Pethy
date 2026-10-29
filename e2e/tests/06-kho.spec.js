import { test, expect, TK, KHU, dangNhap } from '../helpers.js';
import { dn } from '../seed.js';

// Thủ kho: khai báo thuốc, nhập hàng, kiểm kê, cảnh báo sắp hết; và người không phải thủ kho không ghi được kho qua API.
test('thủ kho thêm thuốc, nhập lô, kiểm kê có lý do, thấy cảnh báo sắp hết', async ({ page }) => {
  const ten = 'Thuốc kho ' + Date.now().toString().slice(-6);
  await dangNhap(page, TK.kho, KHU.kho);
  const hop = page.locator('#hop');
  const ob = page.locator('#ds-ton details', { hasText: ten });

  // thêm thuốc mới, hộp nhập hàng tự mở với thuốc đã chọn sẵn
  await page.locator('#them-thuoc').click();
  await page.locator('#t-t').fill(ten);
  await page.locator('#t-d').fill('viên');
  await page.locator('#t-g').fill('12000');
  await page.locator('#t-n').fill('20');
  await hop.getByRole('button', { name: 'Thêm', exact: true }).click();
  await expect(hop.locator('#n-lo')).toBeVisible();

  // nhập sai: hạn dùng đã qua, số lượng không hợp lệ
  await hop.locator('#n-lo').fill('E2E-A1');
  await hop.locator('#n-s').fill('0');
  await hop.locator('#n-h').fill('2035-12-31');
  await hop.getByRole('button', { name: 'Nhập vào kho' }).click();
  await expect(hop.locator('.loi')).toBeVisible();
  await hop.locator('#n-s').fill('10');
  await hop.locator('#n-h').fill('2020-01-01');
  await hop.getByRole('button', { name: 'Nhập vào kho' }).click();
  await expect(hop.locator('.loi')).toBeVisible();
  await expect(hop).toBeVisible();

  // nhập đúng
  await hop.locator('#n-h').fill('2035-12-31');
  await hop.getByRole('button', { name: 'Nhập vào kho' }).click();
  await expect(hop).not.toBeVisible();
  await expect(ob).toHaveCount(1);
  await expect(ob.locator('summary .sl')).toHaveText('10');
  await expect(ob.locator('summary')).toContainText('Sắp hết');          // tồn 10 <= ngưỡng 20
  await expect(page.locator('#ds-cb')).toContainText(ten);
  await expect(page.locator('#ds-ls')).toContainText(ten);

  // nhập thêm cùng lô cùng hạn thì cộng dồn
  await page.locator('#nhap').click();
  await hop.locator('#n-t').selectOption({ label: `${ten} (viên)` });
  await hop.locator('#n-lo').fill('E2E-A1');
  await hop.locator('#n-h').fill('2035-12-31');
  await hop.locator('#n-s').fill('15');
  await hop.getByRole('button', { name: 'Nhập vào kho' }).click();
  await expect(ob.locator('summary .sl')).toHaveText('25');
  await expect(ob.locator('summary')).not.toContainText('Sắp hết');

  // khai báo trùng thuốc bị từ chối
  await page.locator('#them-thuoc').click();
  await page.locator('#t-t').fill(ten);
  await page.locator('#t-d').fill('viên');
  await page.locator('#t-g').fill('12000');
  await page.locator('#t-n').fill('20');
  await hop.getByRole('button', { name: 'Thêm', exact: true }).click();
  await expect(hop.locator('.loi')).toContainText('đã có trong danh mục');
  await hop.getByRole('button', { name: 'Đóng' }).click();

  // kiểm kê: bắt buộc có lý do
  await ob.locator('summary').click();
  await ob.getByRole('button', { name: 'Kiểm kê, sửa số lượng' }).click();
  await hop.locator('#d-s').fill('22');
  await hop.getByRole('button', { name: 'Lưu điều chỉnh' }).click();
  await expect(hop.locator('.loi')).toBeVisible();
  await hop.locator('#d-l').fill('Kiểm kê thiếu 3 viên');
  await hop.getByRole('button', { name: 'Lưu điều chỉnh' }).click();
  await expect(hop).not.toBeVisible();
  await expect(ob.locator('summary .sl')).toHaveText('22');
  await expect(page.locator('#ds-ls')).toContainText('Kiểm kê thiếu 3 viên');
});

test('chủ nuôi và bác sĩ không nhập hay điều chỉnh kho được qua API', async () => {
  for (const tk of [TK.chu_nuoi, TK.bac_si, TK.le_tan]) {
    const { c } = await dn(tk);
    const r = await c.rpc('nhap_kho', { p_thuoc: '00000000-0000-0000-0000-000000000000', p_so_lo: 'X', p_han_dung: '2035-12-31', p_so_luong: 5 });
    expect(r.error, 'nhap_kho phải bị từ chối với ' + tk.email).toBeTruthy();
    const d = await c.rpc('dieu_chinh_kho', { p_lo: '00000000-0000-0000-0000-000000000000', p_so_luong_moi: 1, p_ly_do: 'thử' });
    expect(d.error, 'dieu_chinh_kho phải bị từ chối với ' + tk.email).toBeTruthy();
    const i = await c.from('thuoc').insert({ ten: 'Lén thêm', loai: 'thuoc', don_vi: 'viên', gia_ban: 1 });
    expect(i.error, 'insert thuoc phải bị từ chối với ' + tk.email).toBeTruthy();
  }
});
