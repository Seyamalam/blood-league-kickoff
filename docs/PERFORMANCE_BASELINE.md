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

Revision: `999e312`  
Route: Vite development server, `?stress=72`  
Viewport: 1600×900 CSS pixels, device scale factor 1  
Scene: deterministic frozen mixed roster of all eight ordinary archetypes, 72 enemies  
Sampling: 15 seconds after a two-second warm-up in headless Chrome, background throttling disabled

| Preset / cap         | Frame p50 | Frame p95 | Frame p99 | Calls | Triangles | Result                                                                   |
| -------------------- | --------: | --------: | --------: | ----: | --------: | ------------------------------------------------------------------------ |
| Balanced / 120 FPS   |    8.3 ms |    9.5 ms |   10.7 ms |   162 |     6,808 | 120.5 FPS median; occasional tail misses the 8.33 ms target              |
| Performance / 60 FPS |   16.7 ms |   24.9 ms |   25.0 ms |   162 |     6,808 | GPU headroom is ample, but the limiter shows periodic three-vsync pacing |

The measured renderer workload is below the visual-direction ceiling. The first actionable issue is frame-limiter cadence, not enemy instancing or triangle count. Simulation and render synchronization micro-probes were also far below one millisecond at 72 enemies, but those probes are diagnostic evidence rather than shipping acceptance.

## Remaining Acceptance Work

- Re-run the 72-enemy sample in a production web build and Electron on macOS after the limiter fix.
- Capture a moving/combat-heavy final-wave sample; the frozen scene isolates rendering but omits combat VFX and normal simulation work.
- Record p95/p99 frame pacing, allocation/GC behavior, CPU profile, and GPU evidence.
- Verify stable 60 FPS first, then evaluate 120 FPS in performance mode.
- Test 1920×1080 and one lower or different aspect ratio.
- Tune shadows, population, render scale, and VFX only when a measured bottleneck justifies it.
