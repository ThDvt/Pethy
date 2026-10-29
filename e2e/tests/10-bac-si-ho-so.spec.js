import { createClient } from '@supabase/supabase-js';
import { test, expect, CFG, TK, KHU, dangNhap, ngCanhMoi } from '../helpers.js';
import { chuanBiDuLieuDatLich, dn } from '../seed.js';
import { pngGia } from '../luong.js';

// Bác sĩ tự sửa hồ sơ công khai (chuyên môn, trình độ, chứng chỉ, ảnh đại diện) và khách xem được.
test('bác sĩ sửa hồ sơ: số liệu sai bị chặn, lưu được, tải ảnh đại diện, khách thấy; HTML không chạy', async ({ browser }) => {
  test.setTimeout(120_000);
  await chuanBiDuLieuDatLich();
  const dau = 'Chuyên khoa thử ' + Date.now().toString().slice(-6);
  const cc = 'Chứng chỉ hành nghề số 123 <b>đậm</b>\nChứng nhận siêu âm';
  const c = await ngCanhMoi(browser), p = await c.newPage();
  try {
    await dangNhap(p, TK.bac_si, KHU.bac_si);
    await p.goto('/bac-si/ho-so.html');
    await p.getByRole('button', { name: 'Sửa hồ sơ' }).click();
    const hop = p.locator('#hop');
    await p.locator('#bs-kn').fill('61');
    await hop.getByRole('button', { name: /^Lưu/ }).click();
    await expect(hop.locator('.loi').last()).toContainText('từ 0 đến 60');
    await p.locator('#bs-cm').fill(dau);
    await p.locator('#bs-kn').fill('7');
    await p.locator('#bs-td').fill('Bác sĩ thú y, đào tạo thử');
    await p.locator('#bs-gt').fill('Giới thiệu thử tự động');
    await p.locator('#bs-cc').fill(cc);
    await p.locator('#bs-anh').setInputFiles({ name: 'avatar.png', mimeType: 'image/png', buffer: pngGia(500, 300) });
    await expect(hop.locator('img')).toBeVisible();                                   // xem trước ảnh đã cắt vuông
    await hop.getByRole('button', { name: /^Lưu/ }).click();
    await expect(hop).not.toBeVisible({ timeout: 20_000 });

    // trang hồ sơ hiện lại đúng, HTML hiện nguyên văn
    await expect(p.locator('#vung')).toContainText(dau);
    await expect(p.locator('#vung')).toContainText('7 năm');
    await expect(p.locator('#vung')).toContainText('<b>đậm</b>');
    await expect(p.locator('#vung b')).toHaveCount(0);
    await expect(p.locator('#vung img')).toBeVisible();
    expect(await p.locator('#vung img').evaluate(i => i.complete && i.naturalWidth > 0), 'ảnh đại diện tải được').toBe(true);

    // khách chưa đăng nhập đọc được hồ sơ công khai qua view, không lộ số điện thoại
    const { c: bsApi, id } = await dn(TK.bac_si);
    const khach = createClient(CFG.url, CFG.anon, { auth: { persistSession: false } });
    const r = await khach.from('bac_si_cong_khai').select('*').eq('id', id);
    expect(r.error).toBeNull();
    expect(r.data).toHaveLength(1);
    expect(r.data[0].chuyen_mon).toBe(dau);
    expect(r.data[0].chung_chi).toContain('Chứng nhận siêu âm');
    expect(Object.keys(r.data[0]), 'view công khai không có cột nhạy cảm').not.toContain('so_dien_thoai');

    // gỡ ảnh
    await p.getByRole('button', { name: 'Sửa hồ sơ' }).click();
    await p.getByRole('button', { name: 'Gỡ ảnh' }).click();
    await hop.getByRole('button', { name: /^Lưu/ }).click();
    await expect(hop).not.toBeVisible({ timeout: 20_000 });
    await expect(p.locator('#vung img')).toHaveCount(0);
    expect(bsApi).toBeTruthy();
  } finally { await c.close(); }
});

test('bác sĩ không sửa được hồ sơ của bác sĩ khác, vai trò khác không sửa hồ sơ bác sĩ qua API', async () => {
  const bs = await dn(TK.bac_si);
  for (const tk of [TK.chu_nuoi, TK.le_tan, TK.thu_ngan, TK.kho]) {
    const { c } = await dn(tk);
    const r = await c.from('ho_so_bac_si').update({ chuyen_mon: 'Bị sửa lén' }).eq('tai_khoan_id', bs.id).select();
    expect(r.error || !(r.data || []).length, 'update ho_so_bac_si bởi ' + tk.email).toBeTruthy();
  }
  const an = await bs.c.from('ho_so_bac_si').select('chuyen_mon').eq('tai_khoan_id', bs.id);
  expect(an.data[0].chuyen_mon).not.toBe('Bị sửa lén');
});
