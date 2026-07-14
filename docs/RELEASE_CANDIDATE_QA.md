# Blood League: Kickoff — Release Candidate QA

This document is the acceptance record for the content-complete release candidate. A checked item requires repeatable evidence from the exact candidate revision; feature presence alone is not enough.

## Gameplay and balance

- [x] Deterministic nine-minute simulations cover all six characters across three fixed seeds.
- [x] Authored balance routes collectively exercise every weapon and evolution.
- [x] Every curse changes pressure, survivability, or reward output measurably.
- [x] All five elite modifiers, both minibosses, and all Count Goalkeeper phases have explicit encounter budgets.
- [x] Simulated character power spread remains at or below 35%.
- [ ] Complete one hands-on victory with each character on the candidate build.
- [ ] Complete one hands-on cursed victory and one higher-difficulty victory.
- [ ] Confirm no single upgrade/evolution is mandatory in external playtests.

## Controls and accessibility

- [x] Keyboard controls are rebindable and persisted with conflict validation.
- [x] Conventional and inverted vertical mouse look are both persisted.
- [x] Gamepad uses standard sticks/triggers, Menu for pause, and View for restart.
- [x] Reduced shake, reduced flashes, high-contrast HUD, HUD scaling, color-vision palettes, aim assist, and vibration settings are available.
- [ ] Verify a physical standard gamepad from title screen through victory/defeat results.
- [ ] Verify keyboard-only focus order and Escape/back behavior across every overlay.
- [ ] Verify 1280×720, 1600×900, and 1920×1080 layouts at 100% and 140% HUD scale.

## Presentation and audio

- [x] Six characters have distinct silhouettes, palettes, starting identities, and signature ultimates.
- [x] The Count has a readable transformed desperation form.
- [x] Stadium lighting, moon, runes, and pylons communicate escalation and Blood Moon.
- [x] Boss, evolution, goal, victory, and defeat events receive authored procedural cues.
- [ ] Listen through one full run on headphones and one laptop-speaker pass without clipping or masked critical cues.
- [ ] Verify reduced-flash and reduced-shake presentation in the densest encounter.

## Web and desktop

- [x] Production web build passes automated checks and a clean-cache browser smoke test.
- [ ] macOS Apple silicon and Intel artifacts build with matching checksums.
- [ ] Install and play the downloaded macOS artifact rather than a development server.
- [ ] Only after the preceding gates: build Windows x64 and Linux x64 on native CI runners.
- [ ] Verify Windows `.exe` and Linux AppImage startup, hardware acceleration, input, saves, audio, and shutdown on their target operating systems.

## Media and freeze

- [x] Refresh release-candidate title, progression, difficulty, Codex, and boss-transformation screenshots; retain still-current gameplay/victory/results captures.
- [x] Capture a short production gameplay trailer and record its dimensions, duration, codec, and SHA-256.
- [x] Reconcile README, game design, controls, changelog, and asset ledger with the candidate feature set.
- [ ] Tag the frozen candidate revision and publish verified checksummed artifacts.
