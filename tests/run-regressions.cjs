'use strict';
// Run independent regression jobs without hiding later failures after the first
// obsolete fixture. Exit nonzero if ANY verification fails.
const {spawnSync}=require('node:child_process');
const steps=[
  "node tests/transit-route.mjs",
  "node tests/games-package.mjs",
  "node tests/audit-fixes.mjs",
  "node tests/active-ui-contract.cjs",
  "node tests/location-refinement.mjs",
  "node tests/nearby-refresh.mjs",
  "node tests/map-viewport.cjs",
  "node tests/hardening.cjs",
  "node --check api/duty.js",
  "node --check api/overture.js",
  "node tests/duty.mjs",
  "node tests/viewport.mjs",
  "node tests/overture.mjs",
  "node tests/media.mjs",
  "node tests/model1-data.mjs",
  "node tests/prices.mjs",
  "node tests/fishing.mjs",
  "node tests/location-label.mjs",
  "node tests/discovery.mjs",
  "node tests/discovery-extensions.mjs",
  "node tests/pilot.mjs",
  "node tests/city-services.mjs",
  "node tests/traffic.mjs",
  "node tests/general-data.mjs",
  "npm run build"
];
const failed=[];
for(const cmd of steps){
 console.log('\n[verification] '+cmd);
 const result=spawnSync(cmd,{shell:true,stdio:'inherit',env:process.env});
 if(result.status!==0){failed.push(cmd);console.error('[FAILED] '+cmd+' (exit '+String(result.status)+')');}
}
if(failed.length){console.error('\nVerification failed ('+failed.length+'/'+steps.length+'):\n- '+failed.join('\n- '));process.exitCode=1;}
else console.log('\nAll '+steps.length+' verifications passed.');
