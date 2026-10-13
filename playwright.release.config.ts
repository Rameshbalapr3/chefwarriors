import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'tests/release',workers:1,timeout:180000,use:{headless:true,channel:'msedge',viewport:{width:1366,height:900}},reporter:'list'});
