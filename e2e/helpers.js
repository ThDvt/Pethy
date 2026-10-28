import { test as goc, expect } from '@playwright/test';
import fs from 'node:fs';

export const CFG = {
  url: process.env.E2E_SUPABASE_URL,
  anon: process.env.E2E_SUPABASE_ANON_KEY,
  admin: { email: process.env.E2E_ADMIN_EMAIL, matKhau: process.env.E2E_ADMIN_PASSWORD },
  matKhau: process.env.E2E_MAT_KHAU
};
export const VAI = ['le_tan', 'bac_si', 'thu_ngan', 'kho', 'chu_nuoi'];
export const TK = Object.fromEntries(VAI.map(v => [v, { email: `e2e-${v.replace('_', '-')}@example.com`, matKhau: CFG.matKhau, ten: 'E2E ' + v }]));
TK.admin = { email: CFG.admin.email, matKhau: CFG.admin.matKhau, ten: 'E2E admin' };
export const KHU = { admin: '/admin/', le_tan: '/le-tan/', bac_si: '/bac-si/', thu_ngan: '/thu-ngan/', kho: '/kho/', chu_nuoi: '/chu-nuoi/' };

// Chặn chạy nhầm vào hệ thống thật: URL trong web/js/config.js là hệ thống thật.
export function kiemTraKhongPhaiHeThongThat(){
  for (const k of ['url', 'anon', 'matKhau']) if (!CFG[k]) throw new Error('Thiếu biến môi trường E2E_* (xem docs/kiem-thu-tu-dong.md)');
  if (!CFG.admin.email || !CFG.admin.matKhau) throw new Error('Thiếu E2E_ADMIN_EMAIL hoặc E2E_ADMIN_PASSWORD');
  const thuc = (fs.readFileSync(new URL('../web/js/config.js', import.meta.url), 'utf8').match(/SUPABASE_URL:\s*"([^"]+)"/) || [])[1];
  if (thuc && CFG.url.replace(/\/$/, '') === thuc.replace(/\/$/, '')) throw new Error('E2E_SUPABASE_URL trùng với hệ thống thật. Hãy dùng project Supabase riêng để thử.');
}

const gan = async c => { await c.route('**/js/config.js', r => r.fulfill({ contentType: 'text/javascript',
  body: `window.PETHY_CONFIG={SUPABASE_URL:${JSON.stringify(CFG.url)},SUPABASE_ANON_KEY:${JSON.stringify(CFG.anon)},TURNSTILE_SITE_KEY:""};` })); };
// Trình duyệt thứ hai (ví dụ người khách chưa đăng nhập) cũng phải nối vào project thử.
export async function ngCanhMoi(browser, opts = {}){ const c = await browser.newContext({ baseURL: 'http://localhost:4173', locale: 'vi-VN', ...opts }); await gan(c); return c; }

// Mỗi test: trang web tải cấu hình trỏ vào project THỬ thay vì hệ thống thật.
export const test = goc.extend({
  context: async ({ context }, dung) => {
    await gan(context);
    await dung(context);
  }
});
export { expect };

// Đăng nhập qua giao diện như người thật. Trả về khi đã vào đúng khu.
export async function dangNhap(page, tk, khu){
  await page.goto('/dang-nhap.html');
  await page.locator('#email').fill(tk.email);
  await page.locator('#mat-khau').fill(tk.matKhau);
  await page.locator('#gui').click();
  await page.waitForURL(u => u.pathname.startsWith(khu.replace(/\/$/, '')), { timeout: 20_000 });
}
