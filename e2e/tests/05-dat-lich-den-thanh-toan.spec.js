import { test, expect, TK, KHU, dangNhap, ngCanhMoi } from '../helpers.js';
import { chuanBiDuLieuDatLich, tonKho, DV, THUOC } from '../seed.js';

// Một lượt đầy đủ qua giao diện, mỗi bước do đúng vai trò làm:
// chủ nuôi thêm thú cưng và đặt lịch → lễ tân xác nhận → bác sĩ khám, kê đơn (trừ kho) → thu ngân lập hóa đơn, thu tiền → chủ nuôi thấy hóa đơn.
// Bấm "Lập hóa đơn" và chờ hộp hóa đơn mở. Trên WebKit thỉnh thoảng cú bấm không tới được nút: khi đó trang không báo lỗi, nút không bị khóa
// và không có yêu cầu nào gửi đi (đã ghi nhận từ các lần chẩn đoán). Chỉ trong đúng trường hợp đó mới bấm lại, và có ghi chú vào báo cáo.
// Các trường hợp khác là lỗi thật nên không thử lại: hóa đơn đã lập mà hộp không mở, hoặc trang báo lỗi.
async function bamLapHoaDon(tn, cho, hop){
  const nut = cho.getByRole('button', { name: 'Lập hóa đơn' });
  for (let lan = 1; lan <= 3; lan++) {
    await nut.click();
    try { await expect(hop).toBeVisible({ timeout: 8_000 }); return; }
    catch (e) {
      const loi = (await tn.locator('#loi-chung').isVisible()) ? await tn.locator('#loi-chung').textContent() : '';
      if (loi) throw new Error('Lập hóa đơn báo lỗi: ' + loi);
      if (await cho.count() === 0) throw new Error('Hóa đơn đã được lập (dòng chờ lập đã biến mất) nhưng hộp hóa đơn không mở');
      if (await nut.isDisabled().catch(() => false)) throw new Error('Nút Lập hóa đơn đã bị khóa (mã xử lý đã chạy) nhưng hộp hóa đơn không mở');
      if (lan === 3) throw new Error('Bấm Lập hóa đơn 3 lần, nút vẫn nguyên và không có phản hồi nào');
      test.info().annotations.push({ type: 'bấm lại', description: `Cú bấm Lập hóa đơn lần ${lan} không tới được nút, bấm lại` });
      console.log(`[bấm lại] Lập hóa đơn: cú bấm lần ${lan} không tới được nút (${test.info().project.name})`);
    }
  }
}

test('đặt lịch đến thanh toán, qua năm vai trò', async ({ browser }) => {
  test.setTimeout(180_000);
  const { thuocId } = await chuanBiDuLieuDatLich();
  const ten = 'Mít' + Date.now().toString().slice(-6);
  const ngay = new Date(Date.now() + 3 * 864e5 + 7 * 36e5).toISOString().slice(0, 10); // 3 ngày nữa theo giờ Việt Nam
  const ton0 = await tonKho(thuocId);
  const ctx = {};
  const mo = async (tk, khu) => { const c = await ngCanhMoi(browser); const p = await c.newPage(); await dangNhap(p, tk, khu); ctx[tk.email] = c; return p; };
  try {
    // 1. Chủ nuôi
    const cn = await mo(TK.chu_nuoi, KHU.chu_nuoi);
    await cn.goto('/chu-nuoi/thu-cung.html');
    await cn.locator('#ten').fill(ten);
    await cn.locator('#loai').fill('Chó');
    await cn.locator('#gui').click();
    await expect(cn.locator('#ds')).toContainText(ten);

    await cn.goto('/chu-nuoi/dat-lich.html');
    await cn.locator('label.chon', { hasText: ten }).click();
    await cn.locator('label.chon', { hasText: DV.ten }).click();
    await cn.locator('label.chon', { hasText: TK.bac_si.ten }).click();
    await cn.getByRole('button', { name: 'Tiếp tục: chọn giờ' }).click();
    await cn.locator('#ngay').fill(ngay);
    const gioDau = cn.locator('#gio-box .tg button').first();
    await expect(gioDau).toBeVisible();
    await gioDau.click();
    await cn.getByRole('button', { name: 'Tiếp tục: xác nhận' }).click();
    await expect(cn.locator('.tomtat')).toContainText(ten);
    await cn.getByRole('button', { name: 'Đặt lịch', exact: true }).click();
    await expect(cn.locator('#tieu-de')).toHaveText('Đã gửi yêu cầu đặt lịch');

    // 2. Lễ tân: lịch đang chờ, xác nhận
    const lt = await mo(TK.le_tan, KHU.le_tan);
    const choXn = lt.locator('#ds-cho .hang', { hasText: ten });
    await expect(choXn).toHaveCount(1);
    await choXn.getByRole('button', { name: 'Xác nhận' }).click();
    await expect(lt.locator('#ds-cho .hang', { hasText: ten })).toHaveCount(0);

    // 3. Bác sĩ: khám, kê 2 viên thuốc
    const bs = await mo(TK.bac_si, KHU.bac_si);
    const dong = bs.locator('#ds .hang', { hasText: ten });
    await expect(dong).toHaveCount(1);
    await dong.getByRole('link', { name: 'Khám' }).click();
    await bs.waitForURL(/kham\.html\?lich=/);
    await expect(bs.locator('#thu-cung-kham')).toContainText(ten);
    await bs.locator('#cn').fill('8.5');
    await bs.locator('#nd').fill('38.6');
    await bs.locator('#cd').fill('Viêm da nhẹ, theo dõi thêm');
    await bs.locator('.don select').first().selectOption({ label: `${THUOC.ten} (${THUOC.don_vi})` });
    await bs.locator('.don input.so').first().fill('2');
    await bs.locator('.don .ld input').first().fill('Ngày 2 lần, sau ăn');
    await bs.getByRole('button', { name: 'Lưu hồ sơ và đơn thuốc' }).click();
    await bs.waitForURL(u => u.pathname === '/bac-si/' || u.pathname === '/bac-si/index.html', { timeout: 20_000 });
    expect(await tonKho(thuocId)).toBe(ton0 - 2);                    // kê đơn đã trừ kho đúng 2 viên
    await expect(bs.locator('#ds .hang', { hasText: ten })).toContainText('Xem hồ sơ');

    // 4. Thu ngân: lập hóa đơn rồi thu đủ
    const tn = await mo(TK.thu_ngan, KHU.thu_ngan);
    const cho = tn.locator('#ds-lap .hang', { hasText: ten });
    await expect(cho).toHaveCount(1);
    const hop = tn.locator('#hop');
    await bamLapHoaDon(tn, cho, hop);
    await expect(hop).toContainText(DV.ten);
    await expect(hop).toContainText(THUOC.ten);
    await expect(hop).toContainText(/190[.,]000/);                   // 150.000 dịch vụ + 2 x 20.000 thuốc
    await hop.getByRole('button', { name: 'Ghi nhận thu tiền' }).click();
    await expect(tn.locator('#ds-xong .hang', { hasText: ten })).toHaveCount(1);
    await expect(tn.locator('#ds-thu .hang', { hasText: ten })).toHaveCount(0);

    // 5. Chủ nuôi thấy hóa đơn đã thanh toán, thu ngân không lập lại được
    await cn.goto('/chu-nuoi/hoa-don.html');
    const hd = cn.locator('details', { hasText: ten });
    await expect(hd).toHaveCount(1);
    await expect(hd).toContainText('Đã thanh toán');
    await tn.reload();
    await expect(tn.locator('#ds-lap .hang', { hasText: ten })).toHaveCount(0);
  } finally { for (const c of Object.values(ctx)) await c.close(); }
});
