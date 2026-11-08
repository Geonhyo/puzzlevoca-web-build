import { defineConfig, devices } from '@playwright/test';

/**
 * 실제 화면 테스트. 로컬 서버(웹 3000 + API 8000 + puzzlevoca_local DB)를 대상으로 돈다.
 * 서버가 안 떠 있으면 루트의 `pnpm dev` 를 띄운다. 스크린샷은 test-results/ 에 남는다.
 * 테스트가 만든 유저/기록은 `pnpm db:reset && pnpm db:seed:demo` 로 정리.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: { baseURL: 'http://localhost:3000', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    { name: 'mobile', use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 } } },
    { name: 'desktop', use: { viewport: { width: 1440, height: 900 } } },
  ],
  webServer: { command: 'pnpm --dir .. dev', url: 'http://localhost:3000', reuseExistingServer: true, timeout: 120_000 },
});
