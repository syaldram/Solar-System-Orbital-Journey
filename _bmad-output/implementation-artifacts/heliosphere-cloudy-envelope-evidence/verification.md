# Cloudy heliosphere verification

Recorded 2026-11-02. These captures are review evidence, not bundled application imagery.

## Visual inspection

Inspected the desktop overview, upper and lower orbit angles, high- and low-quality phone layouts, Labels off, and each shell layer independently. The full envelopes retain curved upper/lower silhouettes and smoky structure without an equatorial lid. Interior planet markers, orbit paths and labels remain readable; phone controls, cards and the exact scale disclosure remain accessible.

- `cloud-envelope-up.png`, `cloud-envelope-down.png`: opposing manual orbit angles.
- `cloud-shock-only-below.png`, `cloud-outer-only-below.png`: independent shell layers.
- `sky-desktop-high-labels.png`, `sky-desktop-labels-off-focus.png`: overview and semantic selection with Labels off.
- `sky-phone-high-overview.png`, `sky-phone-low-overview.png`, `sky-phone-low-labels-off-card.png`: phone layouts and quality tiers.

## Automated checks

Final post-review result: `npm run check` passed all 203 unit tests, typecheck, lint and build. `npm run test:e2e -- --workers=3 --timeout=90000 --reporter=list` passed 260 tests with 10 expected platform/duplicate-artifact skips, zero failures, in 7.6 minutes across Chromium, Firefox and WebKit. The earlier results below record the resolved investigation history.

- Node 24.22.2, npm 11.20.0: `npm run check` passed (203 unit tests, typecheck, lint, build). Existing Vite chunk-size warning remains.
- `git diff --check` passed.
- New upper/lower orbit browser coverage passed in Chromium, Firefox and WebKit. The test records screenshots, checks all eight labels and unchanged paused appearance, and toggles each shell layer independently.
- Full three-browser run with `--workers=3 --timeout=90000`: 256 passed, 10 intentional platform/duplicate-artifact skips, four test-fixture failures in 7.7 minutes. One native-touch test used fixed coordinates now overlapping a planet label; three production-smoke instances expected the old explanation copy. Both fixtures were updated without relaxing the gesture/selection assertions. A focused rerun is required to close these failures.
- The first default-timeout concurrent run exceeded 30 seconds in two long heliosphere layout/lifecycle cases. Do not assume the cause is environmental: isolated default-timeout reruns and a separate uncontended benchmark are still required to characterize the performance limitation.

The phase/freeze tests include the actual cloud shader phase alongside boundary scale, flow, shimmer, Sun, spin and scientific positions. Unit tests also prove nested full upper/lower bounds and full angular coverage, containment, resource reuse/disposal, actual density reduction and visible-region selection from both above and below. Review patches verify all five shader materials across phase changes and hidden/shown layers, and include competing solar-wind flow in the region-selection fixture.

## Follow-up results

The root-run focused default-timeout suite passed 9 tests with 2 platform skips. This closes the corrected native-touch test and production-smoke checks on all three engines. Only Chromium's extensive all-speed lifecycle test exceeded 30 seconds; the same lifecycle passed Firefox in 5 seconds and WebKit in 4.8 seconds. This one Chromium test is now explicitly marked slow, with no global timeout configuration change or weakened assertions.

Standalone native Chrome 156.0.8078.80 on Apple M4 Pro, DPR 2, auto resolving to high quality, all layers and planetary/decorative playback enabled:

| Viewport | Average FPS | p95 frame time | Errors |
| --- | --- | --- | --- |
| Desktop 1440 × 900 | 60.00 | 16.8 ms | None |
| Phone viewport 390 × 844 | 60.00 | 16.7 ms | None |

Each observation followed a 10-second warmup and lasted 30 seconds, separately from test execution. Raw evidence is in `desktop-benchmark.json` and `phone-viewport-benchmark.json`; both workload checks are valid. Phone viewport results use the laptop GPU and are not physical-phone measurements.

Independent review produced small test/copy patches and deferred physical-phone cloud-cost profiling. Layer blending remains illustrative surface compositing rather than optical volumetric rendering.

## Acceptance matrix audit

All rows have executed passing coverage in the final run:

| Matrix row | Passing coverage |
| --- | --- |
| Overview/navigation | Full angular geometry/containment unit tests; upper/lower orbit browser test; camera entry/Reset fitting tests and inspected captures |
| Scene selection | Actual drawable selection unit test including flow; five visible surface browser selections and body priority |
| Layer visibility | Hidden-surface selection browser test; independent layer screenshots; all-material hide/show unit assertions |
| Frozen appearance | Full retained-motion lifecycle, delayed RAF/hidden-time and reduced-motion browser tests; all-material phase unit test |
| Adaptation | Actual CSS viewport/density browser test and automatic poor-frame adaptation; resource reuse/disposal unit tests |

## Remaining verification limits

Automated WebKit and phone viewport emulation do not establish native Safari or physical-phone rendering/input/performance. Those checks remain unverified. No deployment was performed.
