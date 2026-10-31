import { defineConfig, devices } from '@playwright/test';

// Chạy giao diện trong thư mục ../web bằng máy chủ tĩnh cục bộ, nhưng nối vào project Supabase THỬ (xem helpers.js).
export default defineConfig({
  testDir: './tests',
  globalSetup: './global-setup.js',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  retries: process.env.CI ? 1 : 0,
  workers: 1,   // các test dùng chung tài khoản thử, chạy lần lượt cho dễ đọc lỗi
  reporter: process.env.CI ? [['list'], ['github'], ['html', { open: 'never' }]] : 'list',
  use: { actionTimeout: 15_000, baseURL: 'http://localhost:4173', trace: 'retain-on-failure', screenshot: 'only-on-failure', locale: 'vi-VN' },
  webServer: { command: 'python3 -m http.server 4173 --directory ../web', url: 'http://localhost:4173/index.html', reuseExistingServer: !process.env.CI },
  projects: [
    { name: 'may-tinh', use: { ...devices['Desktop Chrome'] }, testIgnore: /dien-thoai/ },
    { name: 'dien-thoai', use: { ...devices['Pixel 7'] }, testMatch: /dien-thoai/ },
    // Trình duyệt khác Chrome. Chỉ chạy các kịch bản đại diện (đăng nhập, luồng đặt lịch đến thanh toán, giao diện điện thoại) để không kéo dài quá.
    { name: 'firefox', use: { ...devices['Desktop Firefox'] }, testMatch: /(01-dang-nhap|05-dat-lich)/ },
    { name: 'safari-may-tinh', use: { ...devices['Desktop Safari'] }, testMatch: /(01-dang-nhap|05-dat-lich)/ },
    { name: 'safari-iphone', use: { ...devices['iPhone 14'] }, testMatch: /dien-thoai/ }
  ]
});
