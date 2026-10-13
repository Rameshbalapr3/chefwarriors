import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'tests/ui',workers:1,use:{baseURL:'http://127.0.0.1:5173',headless:true,launchOptions:{channel:'msedge'}},webServer:{command:'npm run dev',url:'http://127.0.0.1:5173',reuseExistingServer:true},reporter:'list'});
