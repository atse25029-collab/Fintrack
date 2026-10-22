import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const rootDir = process.cwd();
const androidDir = path.join(rootDir, 'android');

console.log('🛠️ [1/3] Preparing static assets and syncing with Android...');
execSync('node scripts/export-and-sync.mjs', { stdio: 'inherit' });

// Auto-detect compatible JDK (prefer Java 21 LTS / Java 17/21 over Java 25)
let javaHome = process.env.JAVA_HOME;
const knownJdks = [
  'C:\\Users\\smoha\\AppData\\Local\\JDownloader 2\\jre', // OpenJDK 21 LTS
  'C:\\Program Files\\IDK\\compilers\\java',            // JDK 23
  'C:\\Program Files\\Android\\Android Studio\\jbr',
];

for (const candidate of knownJdks) {
  if (fs.existsSync(candidate)) {
    javaHome = candidate;
    console.log(`☕ Using compatible JDK: ${javaHome}`);
    break;
  }
}

// Auto-detect Android SDK
let androidHome = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
const defaultSdk = path.join(process.env.LOCALAPPDATA || 'C:\\Users\\smoha\\AppData\\Local', 'Android', 'Sdk');
if (!androidHome && fs.existsSync(defaultSdk)) {
  androidHome = defaultSdk;
  console.log(`📱 Using Android SDK: ${androidHome}`);
}

if (androidHome) {
  const localPropPath = path.join(androidDir, 'local.properties');
  const escapedSdk = androidHome.replace(/\\/g, '\\\\');
  fs.writeFileSync(localPropPath, `sdk.dir=${escapedSdk}\n`);
}

const buildEnv = {
  ...process.env,
  ...(javaHome ? { JAVA_HOME: javaHome, PATH: `${path.join(javaHome, 'bin')};${process.env.PATH}` } : {}),
  ...(androidHome ? { ANDROID_HOME: androidHome, ANDROID_SDK_ROOT: androidHome } : {}),
};

console.log('🏗️ [2/3] Compiling standalone Android APK with Gradle...');
const isWindows = process.platform === 'win32';
const gradlewCmd = isWindows ? 'gradlew.bat assembleDebug' : './gradlew assembleDebug';

execSync(gradlewCmd, {
  cwd: androidDir,
  stdio: 'inherit',
  env: buildEnv,
});

console.log('📦 [3/3] Locating built APK binary...');
const apkSource = path.join(androidDir, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
const apkDest = path.join(rootDir, 'FinTrack-debug.apk');

if (fs.existsSync(apkSource)) {
  fs.copyFileSync(apkSource, apkDest);
  const stats = fs.statSync(apkDest);
  const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);
  console.log(`\n🎉 BUILD SUCCESSFUL!`);
  console.log(`📱 Standalone APK: ${apkDest}`);
  console.log(`⚖️ APK File Size: ${sizeMb} MB\n`);
} else {
  console.warn('⚠️ Warning: Could not find generated app-debug.apk at expected location.');
}
