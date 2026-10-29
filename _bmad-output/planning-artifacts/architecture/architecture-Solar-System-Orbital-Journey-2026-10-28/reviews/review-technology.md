# Technology and reality review

Verdict: **PASS — no findings.** Existing technologies, retained repository versions and architectural integration choices have source, code or user-decision evidence. This is a brownfield retention decision; no upgrade-to-latest claim is made.

## Evidence

| Area | Reality check | Result |
| --- | --- | --- |
| Repository stack | [`package.json`](../../../../../package.json), lockfile and CI retain TypeScript 6.0.3, Three.js 0.186.1, Vite 8.3.1, npm 11.20.0 and Node 24. | Spine seed matches the repository. Node is correctly expressed as a supported major/range, not an invented patch pin. |
| Registry existence/engine fit | Run memory records successful `npm view` checks for Three.js 0.186.1, TypeScript 6.0.3 and Vite 8.3.1. Vite engines are `^20.19.0 || >=22.12.0`. | Node 24 is compatible; no version mismatch or new dependency was found. |
| Rendering capability | Current [Three.js documentation](https://threejs.org/docs/) lists the existing scene, geometry, raycasting, camera, shader/uniform and resource mechanisms. Repository `orbital-scene.ts`, `solar-presentation.ts` and `scene-camera-controller.ts` already implement these roles directly. | A schematic cutaway, shared mapping, effects and picking fit the retained rendering stack; the spine does not assert unsupported API signatures or a forecasting model. |
| Static deployment | Current [Vite GitHub Pages guidance](https://vite.dev/guide/static-deploy.html#github-pages) supports the configured repository base and static build output. [`vite.config.ts`](../../../../../vite.config.ts) uses `/Solar-System-Orbital-Journey/`; [deployment workflow](../../../../../.github/workflows/deploy.yml) checks and deploys `dist`. | No backend, provider migration or new operational topology is silently introduced. |
| Tagged presentation state | Current [TypeScript discriminated-union documentation](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#discriminated-unions) supports the proposed exhaustive mode model. Existing experience actions already use a discriminated union and reducer. | This extends the existing pattern rather than requiring an unfamiliar state library. |

## Decision provenance

- **AD-1:** `docs/agents/architecture.md`, PRD section 15 and existing imports establish the layered boundaries, pure astronomy and thin composition root.
- **AD-2:** The user explicitly chose one mutually exclusive presentation mode. The existing Gravity reducer and `ViewMode` union were inspected; preserving exactly three scientific frames is source-grounded.
- **AD-3:** Existing snapshot construction in `src/main.ts` already forces Gravity to the heliocentric snapshot. PRD/SCIENCE and the finalized feature spec prohibit decorative feedback into scientific positions or physical cards.
- **AD-4:** The user explicitly chose experience-owned animation phase. The required gates and cadence come from the finalized feature companion. Current `SolarPresentation` independently tracks animation time, so the spine correctly states a required integration change, rather than falsely describing it as already implemented.
- **AD-5:** The user explicitly chose one rendering-owned mapping. Existing Gravity mapping helpers and camera/label consumption demonstrate that the boundary fits the codebase. Exact Heliosphere geometry is appropriately deferred.
- **AD-6:** The source contract requires one card, identical semantic/scene region selection, hidden-surface exclusion and Follow cancellation. Existing rendering owns marker/body picking. The shared region IDs and hit resolver bind these integration points without introducing a technology dependency.
- **AD-7:** Existing reducer return context, camera-owned `returnPose` and interface-owned focus provide the ownership evidence. Ordered per-session handoffs tighten the existing render-frame mechanism to satisfy the return contract; they are target architecture, not an unsupported claim about current behavior. The prior Gravity focus/Reset ambiguity is fixed in the reviewed revision.
- **AD-8:** PRD, testing instructions, current workflow, URL allowlists and preference persistence establish the static/privacy/performance envelope. Renderer-created DOM and semantic interface DOM now have distinct owners.

## Limits

The reviewed artifact is an architecture contract, not implementation. No source code was changed, no tests were run by this reviewer, and visual quality, performance, browser compatibility and transfer budgets still require implementation evidence as the spine states. No remaining decision depends on an unverified new product, library or service.
