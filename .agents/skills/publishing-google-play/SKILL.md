---
name: publishing-google-play
description: Use when building, signing, validating, uploading, or releasing an Android app through Google Play, including internal testing.
---

# Publishing Google Play

## Preflight
Inspect the existing Android project and CI before editing:
- applicationId/package name
- versionName and versionCode
- minSdk/targetSdk/compileSdk
- signing configuration and secret names
- APK/AAB output paths
- Play service-account integration
- current Play track and existing workflow inputs

## Workflow
1. Preserve package identity and signing identity.
2. Choose a new monotonic versionCode if Play has already accepted the previous one.
3. Keep versionName consistent with repository release conventions.
4. Build a signed AAB for Play and an APK when a direct test build is part of the project workflow.
5. Validate the bundle before upload.
6. Prefer the repository's existing GitHub Actions/Gradle/Bubblewrap/Capacitor pipeline rather than introducing a parallel one.
7. Upload to the requested track; use internal testing first unless the release plan explicitly says otherwise.
8. Verify Play accepted the artifact and record the resulting track/version state.

## Guardrails
- Never regenerate or replace the production keystore casually.
- Never commit secrets, service-account JSON, passwords, or signing material.
- Do not change minSdk, targetSdk, permissions, billing, ads, or package identity merely to silence a build without checking product impact.
- A successful local Gradle build is not proof of Play acceptance.

## Completion contract
Report package name, versionName, versionCode, AAB/APK artifacts, workflow/run evidence, and Play track status.
