# Performance Baseline

This file records reproducible measurements and their limits. Development stress results guide optimization; only production web and Electron captures can close the shipping performance gate.

## Reference Mac

| Item       | Reference                                         |
| ---------- | ------------------------------------------------- |
| Computer   | MacBook Pro (`Mac17,8`)                           |
| CPU/GPU    | Apple M5 Pro, 18-core CPU, 20-core integrated GPU |
| Memory     | 48 GB unified memory                              |
| OS         | macOS 26.5 (25F71)                                |
| Display    | Built-in 3456×2234 Liquid Retina XDR              |
| Browser    | Google Chrome 149.0.7827.201                      |
| WebGL path | ANGLE Metal Renderer: Apple M5 Pro                |

Machine identifiers such as serial number, hardware UUID, and provisioning IDs are intentionally excluded.

## July 14, 2026 Development Stress Sample

Revisions: `999e312` baseline and `22b2268` frame-scheduler retest<br>
Route: Vite development server, `?stress=72`<br>
Viewport: 1600×900 CSS pixels, device scale factor 1<br>
Scene: deterministic frozen mixed roster of all eight ordinary archetypes, 72 enemies<br>
Sampling: 15 seconds after a two-second warm-up in headless Chrome, background throttling disabled

| Preset / cap                     | Frame p50 | Frame p95 | Frame p99 | Calls | Triangles | Result                                                                   |
| -------------------------------- | --------: | --------: | --------: | ----: | --------: | ------------------------------------------------------------------------ |
| Balanced / 120 FPS               |    8.3 ms |    9.5 ms |   10.7 ms |   162 |     6,808 | 120.5 FPS median; occasional tail misses the 8.33 ms target              |
| Performance / 60 FPS, before fix |   16.7 ms |   24.9 ms |   25.0 ms |   162 |     6,808 | GPU headroom is ample, but the limiter shows periodic three-vsync pacing |
| Performance / 60 FPS, after fix  |   16.7 ms |   17.6 ms |   17.7 ms |   162 |     6,808 | Three-vsync regression removed; smoothed rate 59.9 FPS                   |

The measured renderer workload is below the visual-direction ceiling. The first actionable issue was frame-limiter cadence, not enemy instancing or triangle count; `22b2268` replaced last-accepted-frame anchoring with a deadline scheduler and removed the 25 ms tail. Simulation and render synchronization micro-probes were also far below one millisecond at 72 enemies, but those probes are diagnostic evidence rather than shipping acceptance.

## Secondary-Weapon Instancing A/B

The Unreleased instancing pass adds `?stress=72&secondary=full`, which freezes the same crowd while activating all 45 persistent secondary-weapon render records. Both routes were sampled at 1600×900, Balanced quality, and the 120 FPS cap in the Codex in-app Chromium browser after a three-second warm-up.

| Route                       | Active pool | Calls | Triangles | Five-sample mean FPS | Mean frame time |
| --------------------------- | ----------: | ----: | --------: | -------------------: | --------------: |
| `?stress=72`                |       0/205 |   178 |       13K |                103.4 |         9.76 ms |
| `?stress=72&secondary=full` |      45/205 |   183 |       18K |                103.8 |         9.64 ms |

The full 24/3/8/6/4 pool set adds exactly five draw calls and approximately 5K triangles. The short cadence sample is intentionally diagnostic rather than a release acceptance claim, but it showed no meaningful frame-time regression under identical instrumentation. The 1600×900 capture in `docs/screenshots/secondary-weapons.jpg` confirms visible garlic transparency, three orbiters, eight ghost passes, six multiballs, and four gravity wells without instance disappearance or obvious ordering failure.

## Remaining Acceptance Work

Development builds expose an opt-in diagnostics route at `?diagnostics=1`. The HUD shows live counters and
`window.__bloodLeagueDiagnostics()` returns a frozen snapshot with p50/p95/p99 frame times, 60/120 FPS budget
miss rates, draw calls, triangles, GPU resource counts, renderer limits, and viewport details. Recording is
allocation-free; percentile sorting happens only when the console hook is called. The hook cannot be enabled in
production builds.

Players can independently enable **Performance monitor** in Settings. The compact top-right panel samples the
latest 600 presented frames and refreshes at 4 Hz with FPS, smoothed frame time, p95, p99, draw calls, triangles,
pool use, and the most specific WebGL renderer name allowed by the browser. `GAME GPU EST.` counts scene-owned
geometry buffers and texture storage conservatively; it is not total physical VRAM. Browsers do not expose a
trustworthy VRAM total, and Apple silicon uses unified memory, so the panel labels those cases rather than
inventing a hardware capacity.

- Re-run the 72-enemy sample in a production web build and Electron on macOS after the limiter fix.
- Capture a moving/combat-heavy final-wave sample; the frozen scene isolates rendering but omits combat VFX and normal simulation work.
- Record p95/p99 frame pacing, allocation/GC behavior, CPU profile, and GPU evidence.
- Verify stable 60 FPS first, then evaluate 120 FPS in performance mode.
- Test 1920×1080 and one lower or different aspect ratio.
- Tune shadows, population, render scale, and VFX only when a measured bottleneck justifies it.
