---
name: testing-live-show-readiness
description: Use when validating software intended for rehearsal, touring, stage, FOH, backstage, or other live-show use where reliability and fast recovery matter.
---

# Testing Live Show Readiness

## Core principle
A stage tool must remain understandable and recoverable under time pressure. Feature completeness never compensates for fragile operation.

## Readiness checks
1. Identify the actual live workflow: launch, setup, main action, recovery, shutdown/export.
2. Verify startup with normal network, no network, and stale cached state when offline use is promised.
3. Check that essential controls remain visible and usable on the target screen size.
4. Test error states for disconnected devices, missing permissions, unavailable services, empty data, and interrupted actions.
5. Ensure destructive actions require clear intent and cannot be triggered by accidental taps.
6. Verify that a failed optional integration does not block unrelated core tools.
7. Confirm state persistence and recovery after reload/restart where expected.
8. Prefer deterministic local behavior over remote/cloud dependencies for critical show functions.
9. Document any function that requires Internet, a bridge, native permissions, or specific hardware.

## Regression rule
Before changing a working live-show path, capture its current behavior and retest it afterward.

## Completion contract
Report what was tested in realistic show conditions, what was simulated, and what still requires physical-device or venue validation.
