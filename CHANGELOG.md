# Changelog

Notable project changes are recorded here. Versions follow semantic milestone numbering during the jam.

## Unreleased

- Migrated the production plan from Unity to Three.js, TypeScript, Vite, Rapier, and Electron.
- Added the initial web/desktop project scaffold, Windows workflow, and expanded game, architecture, release, and asset-credit documentation.
- Implemented an early playable stadium scaffold with movement/camera controls, ball kick/rebound/recall, basic vampire combat, death/restart, HUD, fixed-step interpolation, and ball recovery fail-safes.
- Added a secured Electron shell, electron-builder portable/ZIP targets, and a tagged Windows GitHub Actions release workflow; Windows artifacts remain unverified.
- Verified local TypeScript checking and the production web build.
- Browser-smoke-tested the styled kickoff, timed spawning, death, and restart flows; booted the production Electron shell locally on macOS.
- Deferred Windows packaging to a manual-only final submission task so active development can focus on completing and polishing gameplay on macOS/browser.
- Added release-to-fire charged kicks, explicit ball states, a 36-unit speed cap, automatic recovery, and perfect-return volleys.
- Added Blood Fan, Winger, Defender, and Coach archetypes with escalating spawn weights, crowd separation, distinct shared visuals, and a Coach speed aura.
- Added original procedural audio feedback for kicks, volleys, recalls, hits, kills, and player damage.
- Re-verified the production web build, live browser kickoff flow, and macOS Electron boot after the combat update.
- Added a directional dash with cooldown, HUD state, and a short invulnerability window.
- Added a typed blood-XP and upgrade core covering all eight guaranteed upgrade definitions; Silver Ball, Power Kick, and Rapid Recall now affect live combat.
- Added an accessible three-card level-up overlay with mouse and keyboard selection.
- Added a data-configurable match director, live objectives, animated goal opportunity, final wave, and victory flow for a three-minute vertical slice.

## v0.0.0 — 2026-07-14

- Established the Blood League: Kickoff concept, scope, production plan, and ordered task list.
- Initialized the jam repository with documentation baseline commit `7d6b7e9`.
