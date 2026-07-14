# Blood League: Kickoff — Release Process

## Purpose

Every major playable milestone receives a reproducible, documented snapshot. Frequent commits preserve jam history; releases prove that specific revisions build and run. The repository freezes by **July 20, 2026 at 11:59 PM Asia/Dhaka**.

## Version Line

| Version          | Exit condition                                                      |
| ---------------- | ------------------------------------------------------------------- |
| `v0.1.0`         | Foundation builds in browser; Electron/Windows pipeline established |
| `v0.2.0`         | Player–ball–enemy combat prototype passes Gate A                    |
| `v0.3.0`         | Three-minute vertical slice passes Gate B                           |
| `v0.5.0`         | Full guaranteed run passes Gate C                                   |
| `v0.8.0-alpha.5` | Regulation field/scoring/goalkeeper/aiming web+macOS prerelease     |
| `v0.8.0`         | Presentation/content complete                                       |
| `v0.9.0`         | Tested release candidate; features frozen                           |
| `v1.0.0`         | Exact itch.io submission revision and repository freeze             |

Patch releases may fix verified blockers between milestones. Do not tag broken or untested revisions merely to match a schedule.

## Commit Policy

- Commit one coherent behavior, fix, asset batch, or documentation update at a time.
- Use concise prefixes such as `feat:`, `fix:`, `perf:`, `art:`, `audio:`, `test:`, `build:`, and `docs:`.
- Push after a verified feature slice and at the end of each active work block.
- Preserve history; do not force-push or rewrite jam commits.
- Update `CHANGELOG.md`, README progress/controls, credits, and relevant design/architecture docs in the same milestone.
- Never commit secrets, caches, dependency folders, raw oversized source assets, or local build junk.

## Pre-Release Checklist

1. Freeze unrelated work and identify the intended commit.
2. Pull/inspect remote state and ensure all required work is committed.
3. Install from the lockfile in a clean environment.
4. Run type-check, tests, and production web build.
5. Smoke-test the web build from a static server.
6. For an alpha tag, build the web and macOS artifacts on their native workflow runners. For a final candidate, explicitly authorize the manual Windows/Linux workflow after the game is complete.
7. Download and run every produced artifact on its target operating system; do not claim Windows/Linux acceptance before those final-only builds exist and are tested.
8. Verify menu, controls, gameplay loop, pause, settings, win/loss, and restart appropriate to the milestone.
9. Update README current content, documentation, credits, known issues, and changelog.
10. Commit/push documentation and fixes; rerun checks if the revision changed.

Use the actual scripts defined in `package.json`; README commands must be updated whenever scripts change.

## Tag and GitHub Release

After checks pass:

```bash
git tag -a vX.Y.Z -m "Blood League: Kickoff vX.Y.Z"
git push origin vX.Y.Z
```

Pushing a version tag runs the verified web/macOS workflow on native GitHub-hosted runners. It creates the GitHub Release if needed, then attaches the web archive, macOS Intel/Apple-silicon packages, and a combined SHA-256 manifest. Alpha tags are prerelease snapshots. Release notes must include:

- milestone and commit SHA;
- implemented gameplay/content;
- default controls;
- tested platforms/hardware;
- performance status;
- known issues/workarounds; and
- asset/credit changes.

Download the published files and smoke-test them. A successful CI job alone is not release acceptance.

If only an attachment job fails after the required artifact jobs pass, use the matching recovery path with the original run ID and release tag. The existing cross-platform recovery workflow is reserved for a manually authorized final-platform run. It validates inputs, downloads the original CI artifacts, verifies every included platform checksum, and attaches unchanged files; never rebuild a tagged release from a different commit.

## Artifact Naming

Use predictable names:

```text
Blood-League-Kickoff-X.Y.Z-Web.zip
Blood-League-Kickoff-X.Y.Z-Windows-Portable-x64.exe
Blood-League-Kickoff-X.Y.Z-Windows-x64.zip
Blood-League-Kickoff-X.Y.Z-macOS-arm64.zip
Blood-League-Kickoff-X.Y.Z-macOS-x64.zip
Blood-League-Kickoff-X.Y.Z-Linux-x64.AppImage
Blood-League-Kickoff-X.Y.Z-Linux-x64.zip
SHA256SUMS.txt
```

Routine alpha tags produce only the Web ZIP, macOS archives/installers, and their checksum manifest. Windows and Linux names in this list apply only to the confirmation-gated manual final-platform workflow.

The web ZIP contains the contents of `dist/` at its root, not a nested development repository. Desktop archives should contain only player-facing runtime files and required licenses/readme.

The automated macOS builds are unsigned and unnotarized because the project does not yet have an Apple Developer signing identity. On first launch, testers may need to control-click the app and choose **Open**, or approve it under **System Settings → Privacy & Security**. Signing and notarization should replace this workaround before broad distribution if credentials become available.

## Rollback and Failed Releases

- Do not move an existing version tag to a different commit.
- If a published artifact is wrong, document it, create a fix commit, and issue the next patch version.
- If Windows packaging fails near deadline, keep the verified web build shippable while repairing desktop packaging.
- Never enable Windows/Linux for an ordinary alpha tag; run them manually only after web/macOS gameplay is finished and final validation is authorized.
- Cut unstable target features rather than weakening the guaranteed build.

## Final Freeze

For `v1.0.0`, confirm the GitHub tag, source revision, GitHub artifacts, and itch.io uploads all match. Test the exact downloaded itch.io files while time remains. After the deadline, make no repository or project-file changes before the onsite event. Pitch editing/uploading may continue within its separate deadline without changing the frozen game source.
