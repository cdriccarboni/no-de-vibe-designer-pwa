---
name: auditing-mobile-pwa
description: Use when checking or fixing mobile UI, responsive behavior, PWA installability, offline behavior, touch interaction, scrolling, contrast, or safe-area regressions.
---

# Auditing Mobile PWA

## Goal
Validate the real mobile experience, not only desktop responsive CSS.

## Audit order
1. Identify the supported surfaces: desktop web, phone web/PWA, Android wrapper, iOS web/PWA.
2. Inspect current mobile-specific layout and breakpoint logic before editing.
3. Check navigation, header, menus, modals, long lists, forms, search, keyboard overlap, and scrolling.
4. Check light/dark/theme contrast for text, icons, controls, disabled states, menus, and overlays.
5. Check touch targets, tap feedback, safe areas, fixed/sticky elements, and orientation changes.
6. Verify no horizontal page overflow and no trapped scroll regions.
7. Verify the manifest, icons, service worker, update behavior, installability, and offline fallback where the app promises offline use.
8. Test the main user journey at narrow width and at one wider mobile/tablet width.

## Rules
- Prefer dedicated mobile composition when the product requires it; do not force desktop layout into a phone.
- Do not hide broken content with overflow clipping.
- Do not solve contrast by hard-coding one theme only.
- A modal must always have a reachable close/escape path.
- Important actions must work by tap without hover.

## Completion contract
List tested surfaces and explicitly name any unverified device-only behavior.
