import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const rootDir = process.cwd();
const apiDir = path.join(rootDir, 'app', 'api');
const tempApiDir = path.join(rootDir, 'app', '_api');

console.log('🚀 Starting FinTrack Static Export for Android...');

let apiRenamed = false;
try {
  // Step 1: Temporarily hide app/api during static export
  if (fs.existsSync(apiDir)) {
    fs.renameSync(apiDir, tempApiDir);
    apiRenamed = true;
    console.log('📦 Isolated dynamic server API routes for static bundle.');
  }

  // Step 2: Run next build with STATIC_EXPORT=true
  console.log('⚡ Running Next.js static build...');
  execSync('npx next build', {
    stdio: 'inherit',
    env: { ...process.env, STATIC_EXPORT: 'true' },
  });

  console.log('✅ Static export completed successfully.');
} finally {
  // Restore app/api regardless of success or failure
  if (apiRenamed && fs.existsSync(tempApiDir)) {
    fs.renameSync(tempApiDir, apiDir);
    console.log('🔄 Restored dynamic API routes.');
  }
}

// Step 3: Sync static bundle with Capacitor Android native project
console.log('📱 Syncing assets with Android project...');
execSync('npx cap sync android', { stdio: 'inherit' });
console.log('🎉 Android native assets synchronized successfully!');
