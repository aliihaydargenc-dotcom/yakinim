import {defineConfig} from '@playwright/test';
import mobileConfig from './playwright.config';

// Preserve the historical suites for opt-in cleanup and regression research.
// BrowserStack's real-device spec only runs through the separate paid workflow.
export default defineConfig(mobileConfig,{
 testMatch:[
  'mobile-foundation.spec.ts','shell.spec.ts','redesign.spec.ts',
  'fixes.spec.ts','city-services.spec.ts','fishing-prices.spec.ts',
  'discovery.spec.ts','map-feedback.spec.ts','unified-mobile.spec.ts'
 ],
 maxFailures:6,
 retries:0,
});
