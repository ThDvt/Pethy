import { test, expect, CFG, TK, KHU, dangNhap } from '../helpers.js';
import { deflateSync } from 'node:zlib';

// PNG đơn sắc 800x450 tạo tại chỗ (không phụ thuộc tệp ngoài).
function pngGia(w = 800, h = 450){
  const bang = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; bang[n] = c >>> 0; }
  const crc = b => { let r = 0xffffffff; for (const x of b) r = bang[(r ^ x) & 255] ^ (r >>> 8); return (r ^ 0xffffffff) >>> 0; };
  const chunk = (ten, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(ten), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  const hang = Buffer.concat([Buffer.from([0]), Buffer.alloc(w * 3, 180)]);
  const raw = Buffer.concat(Array.from({ length: h }, () => hang));
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

test('admin viết bài: nháp thì khách không thấy, đăng thì thấy, HTML không chạy, gỡ và xóa thì mất', async ({ browser, page }) => {
  const tde = 'Bài thử tự động ' + Date.now();
  const nhatKy = [];   // ghi lại lỗi mạng và lỗi console để biết bước nào hỏng
  page.on('response', r => { if (r.status() >= 400) nhatKy.push(`${r.status()} ${r.request().method()} ${r.url().replace(/^https?:\/\/[^/]+/, '')}`); });
  page.on('requestfailed', r => nhatKy.push(`FAILED ${r.method()} ${r.url().replace(/^https?:\/\/[^/]+/, '')} ${r.failure()?.errorText}`));
  page.on('console', m => { if (m.type() === 'error') nhatKy.push('console: ' + m.text().slice(0, 200)); });
  page.on('pageerror', e => nhatKy.push('pageerror: ' + e.message.slice(0, 200)));
  await dangNhap(page, TK.admin, KHU.admin);
  await page.goto('/admin/bai-viet.html');
  await page.getByRole('button', { name: 'Viết bài mới' }).click();
  await page.locator('#b-t').fill(tde);
  await page.locator('#b-nd').fill('Đoạn một <b>không được in đậm</b> <img src=x onerror="window.__xss=1">\n\n## Tiêu đề nhỏ\n- Mục A\n- Mục B');
  await page.locator('#b-anh').setInputFiles({ name: 'bia.png', mimeType: 'image/png', buffer: pngGia() });
  await expect(page.locator('#hop img[alt="Ảnh bìa"]')).toBeVisible();
  await page.getByRole('button', { name: 'Tạo bài' }).click();
  await page.waitForTimeout(8000);
  const trang = {
    cacLoiTrongHop: (await page.locator('#hop .loi').allTextContents()).map(t => t.trim()).filter(Boolean),
    hopMo: await page.locator('#hop').evaluate(d => d.open).catch(() => null),
    loiChung: ((await page.locator('#loi-chung').textContent().catch(() => '')) || '').trim(),
    nutTaoBai: (await page.getByRole('button', { name: 'Tạo bài' }).count()) ? 'con' : 'da dong',
    soHang: await page.locator('.hang').count(), nhatKy };
  if (trang.hopMo || trang.cacLoiTrongHop.length || trang.soHang !== 1) throw new Error('Tình trạng sau khi bấm Tạo bài: ' + JSON.stringify(trang, null, 1));
  const hang = page.locator('.hang', { hasText: tde });
  await expect(hang).toBeVisible();

  const khach = await browser.newContext();
  await khach.route('**/js/config.js', r => r.fulfill({ contentType: 'text/javascript',
    body: `window.PETHY_CONFIG={SUPABASE_URL:${JSON.stringify(CFG.url)},SUPABASE_ANON_KEY:${JSON.stringify(CFG.anon)},TURNSTILE_SITE_KEY:""};` }));
  try {
    const k = await khach.newPage();
    await k.goto('/tin-tuc.html');
    await expect(k.locator('#bv-ds')).not.toContainText('Đang tải');
    await expect(k.getByText(tde)).toHaveCount(0);      // bài nháp không lộ

    await hang.getByRole('button', { name: 'Đăng', exact: true }).click();
    await expect(hang.getByRole('button', { name: 'Gỡ xuống' })).toBeVisible();

    await k.reload();
    const the = k.locator('.the-bv', { hasText: tde });
    await expect(the).toBeVisible();
    await expect(the.locator('img.bv-anh')).toBeVisible();
    const duong = await the.getAttribute('href');
    await the.click();
    await expect(k.locator('h1')).toHaveText(tde);
    await expect(k.locator('.bv-nd h2')).toHaveText('Tiêu đề nhỏ');
    await expect(k.locator('.bv-nd li')).toHaveCount(2);
    await expect(k.locator('.bv-nd')).toContainText('<b>không được in đậm</b>');   // hiện nguyên chữ
    expect(await k.evaluate(() => window.__xss)).toBeUndefined();
    await expect(k.locator('img.bv-bia')).toBeVisible();

    await k.goto('/index.html');
    await expect(k.locator('#goc-thu-y')).toBeVisible();

    await hang.getByRole('button', { name: 'Gỡ xuống' }).click();
    await expect(hang.getByRole('button', { name: 'Đăng', exact: true })).toBeVisible();
    await k.goto(duong);
    await expect(k.getByText('Không tìm thấy bài viết')).toBeVisible();

    await hang.getByRole('button', { name: 'Xóa', exact: true }).click();
    await page.getByRole('button', { name: 'Xóa bài' }).click();
    await expect(page.getByText(tde)).toHaveCount(0);
  } finally { await khach.close(); }
});

test('không phải admin thì không ghi được bài viết qua API', async ({ page }) => {
  await dangNhap(page, TK.le_tan, KHU.le_tan);
  const kq = await page.evaluate(async () => (await Pethy.db.from('bai_viet').insert({ tieu_de: 'x', noi_dung: 'y', trang_thai: 'da_dang' })).error?.code || 'duoc');
  expect(kq).not.toBe('duoc');
});
