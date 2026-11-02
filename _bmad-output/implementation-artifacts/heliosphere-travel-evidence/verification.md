# Heliosphere travel verification

Verified on 2026-11-02 using Node 24.22.2 and npm 11.20.0.

- `npm run check`: typecheck, lint, 205 unit tests and production build pass.
- `npm run test:e2e -- --workers=3 --reporter=line --timeout=90000`: 269 passed, 10 existing platform/duplicate-capture skips, across Chromium, Firefox and WebKit.
- The focused GPU and controlled travel tests pass all nine engine cases. Each actual region material changes rendered RGB pixels when only its texture offset changes; repeated identical samples render identically. These are difference checks, not fixed pixel snapshots.
- Parent inspected desktop and phone overview, inspection and resumed captures. The complete nested envelopes, planet labels and geometric travel cues remain readable. The camera retains the chosen inspection angle during travel; controls preserve pause/resume, layers, selection and Back.

The [desktop sequence](desktop-sequence.json) and [phone sequence](phone-sequence.json) list each frame's retained presentation seconds, simulated UTC milliseconds, playback state, camera position and orientation. The browser clock is stopped during capture so metadata matches the frame. Before, moving, paused and resumed PNGs are colocated. The tests additionally wait through a paused interval and assert unchanged render samples, including guides and all region offsets.

The first local 30-second suite attempt timed out in the existing long multi-layout test. The final run uses the repository's 90-second CI allowance. A preliminary unsupported describe-scoped video option was removed before the passing runs; evidence uses controlled frame sequences.

Three independent review layers completed. All findings were individually triaged in the spec; direct fixes strengthened GPU output, camera and visual evidence checks and corrected buffer usage. No findings were deferred.

Travel direction, cadence, boundary shape, texture motion and guide compositing are illustrative. The interstellar envelope is context, not material transported by the Sun. Native Safari, physical-phone frame rate and deployed behavior remain unverified. No push or deployment was performed.
