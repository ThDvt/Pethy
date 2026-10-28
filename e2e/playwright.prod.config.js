import { defineConfig, devices } from '@playwright/test';

// Kiểm tra CHỈ ĐỌC trên bản đang chạy thật (không đăng nhập, không ghi dữ liệu): trang có tải được, tiêu đề bảo mật có đúng, dữ liệu công khai có hiện.
export default defineConfig({
  testDir: './prod',
  timeout: 60_000,
  retries: 1,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report-prod' }]],
  use: { baseURL: process.env.E2E_PROD_URL || 'https://pethy.bo3tuoi1999.workers.dev', trace: 'retain-on-failure', locale: 'vi-VN' },
  projects: [{ name: 'may-tinh', use: { ...devices['Desktop Chrome'] } }, { name: 'dien-thoai', use: { ...devices['Pixel 7'] } }]
});
