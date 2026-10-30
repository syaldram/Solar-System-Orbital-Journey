# Local verification environment — 2026-10-30

Read-only host metadata: MacBook Pro, model Mac16,8, Apple M4 Pro,48 GB RAM; macOS26.7.2 build25G332. No serial number, hardware UUID or private identifier was collected in the recorded output.

Installed application metadata at standard Applications paths: Google Chrome156.0.8078.74; Firefox159.0; Safari27.0 (21625.1.29.18.28). Microsoft Edge was not found at the standard path. These are installed-version records, not a claim that every vendor browser passed manual release checks. Record actual launched browser versions and graphics backend in measurements.

Native UI inventory was unavailable: apps[],browsers[], with errors `Computer Use server error -10005: failed to read configuration layers: destination denied by application network policy` and `The browser access host is unavailable`. No native Safari manual interaction occurred. Physical-phone hardware measurements are unavailable; viewport/touch emulation cannot establish physical-phone FPS. Preserve these rows explicitly UNVERIFIED, not passed.

The local MacBook Pro permits a recorded laptop benchmark if a supported real graphics backend is available. State headless/headed mode, browser version, viewport/DPR, requested/effective quality, all-layer scene workload, warm-up/duration, frame method and observed interval/FPS distribution. Distinguish a local automated measurement from manual Safari verification and from physical phone results. Do not run it concurrently with the complete browser suite.

Primary metadata sources checked2026-10-30 (numeric calculations must remain unchanged):
- JPL approximate positions: https://ssd.jpl.nasa.gov/planets/approx_pos.html — J2000 Julian date2451545.0;36525-day Julian-century formula; periodic correction bT²+c cos(fT)+s sin(fT). The b coefficient is degrees/century², c/s degrees and f degrees/century, not one common unit for all four.
- JPL astrodynamic parameters: https://ssd.jpl.nasa.gov/astro_par.html — day86400s, Julian year365.25days, Julian century36525days, AU149597870700m (same existing149597870.7km).
- ECMAScript time definitions: https://tc39.es/ecma262/multipage/numbers-and-dates.html#sec-time-values-and-time-range and #sec-time-related-constants — Unix epoch1970-01-01T00:00:00Z; milliseconds/day86400000. Retain the existing UTC/model approximation and leap-second policy.
- JPL JD conversion API, development-time lookup only: https://ssd-api.jpl.nasa.gov/jd_cal.api?cd=1970-01-01 returned `jd:2440587.5000000`, `cd:1970-01-01 00:00:00`, source NASA/JPL JD-Calendar Conversion API. Do not introduce any runtime API request.

Frozen science outputs in story-1-6-science-baseline.json were generated from canonical pre-story HEAD c7ca33e5bdaf8e5d686d433fd79fecebb421f7f4. They are application regression baselines, not independent Horizons observations. Keep that distinction alongside the existing independent J2000 reference tests.
