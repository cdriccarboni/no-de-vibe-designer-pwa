---
name: shipping-app-release
description: Use when preparing, validating, packaging, deploying, or publishing an application release from a repository.
---

# Shipping App Release

## Core rule
A release is not done when code is written. It is done when the intended artifact is built, verified, published to the requested channel, and traceable.

## Workflow
1. Inspect the current branch, HEAD, working tree, package/app identifiers, version fields, workflows, and existing release docs.
2. Reuse the repository's existing release pipeline. Do not create a second competing pipeline without a demonstrated need.
3. Run the relevant test/build commands before changing release metadata.
4. Make the smallest release change necessary.
5. Re-run tests and production builds after the change.
6. Verify generated artifacts exist and are the expected type/version.
7. Push the intended branch/commit and run the repository's existing CI/CD path when available.
8. Verify the deployed/public artifact, not only the CI log.
9. Report commit SHA, version, artifact names, publication channel, and any remaining external blocker.

## Invariants
- Never silently change package/bundle identifiers.
- Never replace signing keys unless explicitly required.
- Never reuse a store version code that has already been accepted.
- Never claim a web fix is also delivered on Android unless the Android artifact was rebuilt.
- Preserve rollbackability and existing release history.

## Completion contract
Before saying DONE, provide evidence for: source commit, successful build/test, produced artifact, and publication status.
