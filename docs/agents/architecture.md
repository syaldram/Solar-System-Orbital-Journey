# Architecture

Dependencies flow through these module boundaries. Put new logic in the module that owns it; `src/main.ts` stays a thin composition root.

| Module | Owns | Stays independent of |
| --- | --- | --- |
| `src/astronomy/` | Pure astronomical calculations, physical data, units, reference-frame transformations | DOM, Three.js, the clock (dates arrive as arguments) |
| `src/rendering/` | Three.js scenes built from calculated data; visual size exaggeration for legibility | Scientific rules, simulation time |
| `src/experience/` | Deterministic app state, playback, guided tour, selection, view preferences, state transitions | DOM |
| `src/interface/` | Semantic HTML controls, accessible content, validated URL state, user-facing panels | |
| `src/main.ts` | Module wiring, `localStorage` persistence of presentation preferences, WebGL fallback | Feature logic |

- Rendering-only approximations live in `src/rendering/`, so astronomy outputs stay physically honest.
- Modules talk through small typed interfaces.
- `src/main.ts` wraps `OrbitalScene` construction in a `try`/`catch` error boundary so the page stays useful without WebGL; keep it there.

## TypeScript

- Explicit domain types; `readonly` inputs and outputs where practical.
- State actions are handled exhaustively.
- Validate data at external boundaries (URL, `localStorage`) before narrowing its type, rather than casting.
- Extend the patterns in nearby code and tests; an isolated change fits the existing structure.
