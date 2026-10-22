import { defineConfig, devices } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const state = resolve('../.research/e2e');
mkdirSync(state, { recursive: true });
const python = process.env.RANKDLAB_PYTHON ?? (process.platform === 'win32' ? '../backend/.venv/Scripts/python.exe' : '../backend/.venv/bin/python');
export default defineConfig({
  testDir: './e2e', fullyParallel: false, workers: 1, timeout: 60000,
  expect: { timeout: 15000 }, reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:5174', trace: 'retain-on-failure', screenshot:'only-on-failure',
    launchOptions: { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } },
  projects: [{ name:'chromium', use: {...devices['Desktop Chrome'], viewport: {width:1440,height:1000}} }],
  webServer: [
    { command: `"${python}" -m uvicorn app.main:app --host 127.0.0.1 --port 8001`, url:'http://127.0.0.1:8001/api/health', reuseExistingServer:false,
      env: {RANKDLAB_DATABASE_URL:`sqlite:///${state.replaceAll('\\','/')}/test.db`,RANKDLAB_DATA_DIR:state,RANKDLAB_ORIGINS:'["http://127.0.0.1:5174"]'} },
    { command:'npm run dev -- --port 5174', url:'http://127.0.0.1:5174',reuseExistingServer:false,env:{API_PROXY:'http://127.0.0.1:8001'} },
  ],
});
