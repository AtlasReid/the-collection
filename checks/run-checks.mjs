import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const checks=[
  'check-projection.mjs',
  'checks/check-close-up-fit.mjs',
  'checks/check-camera-flight.mjs',
  'checks/check-display-quality.mjs',
  'checks/check-graphics-settings.mjs',
  'check-arrangement.mjs',
  'check-macbook.mjs',
  'check-hardware-scale.mjs',
  'check-table-case-hover.mjs',
  'check-screen-proximity.mjs',
  'check-screen-aperture.mjs',
  'music/check-import-library.mjs',
  'checks/check-interface-state.mjs',
  'checks/check-preview-library.mjs',
  'checks/check-soundcloud-transport.mjs',
  'checks/check-bandcamp-window.mjs',
  'checks/check-playback-sources.mjs',
  'checks/check-window-manager.mjs',
  'checks/check-music-window.mjs',
  'checks/check-site.mjs',
];
for(const check of checks){
  const result=spawnSync(process.execPath,[check],{cwd:root,stdio:'inherit'});
  if(result.error)throw result.error;
  if(result.status!==0)process.exit(result.status||1);
}
console.log(`PASS all ${checks.length} check suites`);
