#!/usr/bin/env node
/**
 * Build Android APK without mutating the machine-wide Java config.
 * Prefers Android Studio JBR, then Homebrew openjdk@17 / @21.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const home = os.homedir();

function exists(p) {
  try { return fs.existsSync(p); } catch { return false; }
}

function resolveJavaHome() {
  const candidates = [
    process.env.JAVA_HOME,
    "/Applications/Android Studio.app/Contents/jbr/Contents/Home",
    "/Applications/Android Studio.app/Contents/jre/Contents/Home",
    `${home}/Applications/Android Studio.app/Contents/jbr/Contents/Home`,
    "/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home",
    "/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home",
    "/usr/local/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home"
  ].filter(Boolean);
  for (const c of candidates) {
    if (exists(path.join(c, "bin", "java"))) return c;
  }
  throw new Error("Aucun JDK trouvé (Android Studio JBR ou Homebrew openjdk@17/@21)");
}

function resolveSdk() {
  const candidates = [
    process.env.ANDROID_HOME,
    process.env.ANDROID_SDK_ROOT,
    path.join(home, "Library/Android/sdk"),
    path.join(home, "Android/Sdk")
  ].filter(Boolean);
  for (const c of candidates) {
    if (exists(c)) return c;
  }
  throw new Error("Android SDK introuvable (attendu ~/Library/Android/sdk)");
}

function run(cmd, args, { cwd, env } = {}) {
  console.log(`→ ${cmd} ${args.join(" ")}`);
  const r = spawnSync(cmd, args, {
    cwd: cwd || root,
    env,
    stdio: "inherit",
    shell: false
  });
  if (r.status !== 0) process.exit(r.status || 1);
}

const javaHome = resolveJavaHome();
const sdk = resolveSdk();
const localProps = path.join(root, "android", "local.properties");
fs.writeFileSync(localProps, `sdk.dir=${sdk.replace(/\\/g, "/")}\n`);

const env = {
  ...process.env,
  JAVA_HOME: javaHome,
  ANDROID_HOME: sdk,
  ANDROID_SDK_ROOT: sdk,
  PATH: `${path.join(javaHome, "bin")}${path.delimiter}${process.env.PATH || ""}`
};

console.log(`JAVA_HOME=${javaHome}`);
console.log(`ANDROID_HOME=${sdk}`);

run("npm", ["run", "android:sync"], { env });

const wantRelease = process.argv.includes("--release");
const tasks = wantRelease ? ["assembleDebug", "assembleRelease"] : ["assembleDebug"];
const gradlew = path.join(root, "android", "gradlew");
run(gradlew, [...tasks, "--no-daemon"], { cwd: path.join(root, "android"), env });

const apkDebug = path.join(root, "android/app/build/outputs/apk/debug/app-debug.apk");
if (!exists(apkDebug)) {
  console.error(`APK debug introuvable : ${apkDebug}`);
  process.exit(1);
}
console.log(`OK · APK debug ${apkDebug}`);

if (wantRelease) {
  const candidates = [
    path.join(root, "android/app/build/outputs/apk/release/app-release-unsigned.apk"),
    path.join(root, "android/app/build/outputs/apk/release/app-release.apk")
  ];
  const found = candidates.find(exists);
  if (!found) {
    console.error("APK release introuvable (unsigned attendu sans keystore)");
    process.exit(1);
  }
  console.log(`OK · APK release ${found}`);
}
