# Presentation input reconciliation

Verdict: No blocking contradiction or lost capability. The source companion remains explicitly binding, and its accepted regions, explanations, clocks, lifecycle, access, sharing, layers and background are preserved or incorporated by reference. Two small architecture clarifications would strengthen independent implementation.

## Medium — Make the radial mapping invariant explicit

AD-5 requires orbital phase/order and one mapping, but does not expressly require that radial mapping be monotonically increasing and compressed. The source's Display scale section explicitly delegates an exact **monotonic** distance mapping while requiring compressed distances. A per-body display rearrangement can satisfy a loose interpretation of preserved planetary order without preserving the continuous radial relationship used by paths and positions.

Suggested fix: AD-5 should explicitly require one monotonically increasing compressed radial mapping, with display-size exaggeration separate from scientific radii. Keep exact factors deferred.

## Medium — Name one body/region hit resolver

AD-6 centralizes the visibility lookup and common region identities, but does not explicitly centralize arbitration between a body/marker hit and overlapping translucent region surfaces. A body-selection implementation can preserve the old marker-first behavior while a region implementation intercepts the same pointer through the outer boundary; both can use the same IDs and visibility table. This risks losing the companion's scene access to planets or all five regions even though semantic buttons work.

Suggested fix: name one rendering-owned picking resolver for body markers, body meshes and region surfaces/proxies, with a shared deterministic priority policy and hidden-layer filtering. Preserve visible body access and demonstrate all five scene-selectable regions. Exact proxy shape may stay deferred.

## Preserved checks

- Five named regions and exact explanation authority; all planets remain inside termination shock and physical cards remain scientific.
- Elongated cutaway/tail, nested boundaries, shared displayed geometry, exact disclosure authority and independent decorative animation.
- Pause/scrub/endpoint/visibility/reduced-motion transitions, entry/Back capture, clean Home/journey exits, focus and session-only sharing.
- Four reset-on-entry layers, hidden-layer explanation retention, single card, Follow cancellation and semantic control access.
- Dim diagonal Milky Way band, sparse static stars and quality adaptation appear in Deferred with binding source references.

No product or implementation changes were made by this reconciliation.
