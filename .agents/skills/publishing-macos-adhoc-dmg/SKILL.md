---
name: publishing-macos-adhoc-dmg
description: Use when packaging or distributing a macOS application outside the Mac App Store without an Apple Developer subscription or notarization.
---

# Publishing macOS Ad-Hoc DMG

## Goal
Produce a clean distributable app/DMG while being explicit that it is not Apple-notarized.

## Workflow
1. Inspect the existing macOS build/package scripts and bundle identifier.
2. Build the production app for the intended Apple Silicon/Intel targets.
3. Apply ad-hoc signing only when that is the repository's chosen distribution path.
4. Verify the bundle structure and signature locally.
5. Package the app into the project's DMG/ZIP format.
6. Reinstall from the packaged artifact and verify launch behavior on a clean path.
7. Document the normal Finder/System Settings "Open Anyway" Gatekeeper path without requiring Terminal from the end user.
8. Publish checksum, version, commit SHA, and artifact name with the release.

## Guardrails
- Never claim the app is notarized when it is not.
- Never fabricate Developer ID credentials.
- Do not weaken system-wide Gatekeeper settings.
- Do not require users to disable macOS security globally.
- Preserve the app's bundle identifier and data directories across updates.

## Completion contract
Report architecture, version, signing mode, DMG/ZIP artifact, checksum, launch verification, and the expected Gatekeeper behavior.
