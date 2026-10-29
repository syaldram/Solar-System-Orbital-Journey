# Adversarial consistency review

Verdict: **PASS**. No remaining critical, high or medium consistency hole found in the updated spine. The prior reconciliation's monotonic-mapping and competing-hit concerns are closed by AD-5 and AD-6. No new user decision is required by this lens.

## Attack attempts

| Independent units | Attempted incompatible implementations | Rule that prevents the divergence |
| --- | --- | --- |
| Gravity state and Heliosphere state | Both hold active flags or overwrite separate saved scientific views. | AD-2 requires one reducer-owned discriminated mode, one captured context, no nesting and no direct schematic-to-schematic entry. |
| Experience timeline and rendering effects | Each advances its own timer, catches up on visibility return, or changes breathing pace with planetary speed. | AD-4 makes experience the sole phase owner, gates advancement, orders visibility input before advancement and requires retained-phase resume. Rendering samples rather than advances. |
| Body renderer and camera/label/path components | Each chooses compression or radius rules, causing visible geometry and targets to disagree. | AD-5 fixes one monotonic rendering-owned mapping and explicitly requires all consumers to use it or its resulting transforms. |
| Region picker and body picker | A transparent boundary and a body both dispatch selections from one pointer activation. | Updated AD-6 requires one hit resolver, at most one selection and common visibility filtering. Exact priority/proxy geometry remains internal to that single resolver, so does not need an additional cross-unit rule. |
| Region controls and information cards | Buttons use display labels or indexes as IDs; hidden layers close cards or reappear during semantic selection. | AD-6 and the ID convention require the same typed IDs, one tagged authoritative selection, no unhide side effect and retained explanation access. |
| Reducer and camera controller | Entry followed by Back/Home before the next animation frame loses the saved pose or restores a stale pose. | AD-7 requires every accepted handoff in order, one session-associated pose, capture once, Back-only restore and discard on Home/journey exit. |
| Preference/share adapters and schematic state | Whole-state serialization leaks region selection, phase, layers or camera return data. | AD-8 and External boundaries preserve the scientific allowlists and prohibit schematic serialization; sharing is also guarded beyond the disabled UI. |
| Quality adaptation and interaction/science units | Lower quality changes orbital accuracy, mapping, region IDs, effect cadence or accessible region choices. | AD-8 prohibits those changes and permits only visual-density/detail/pixel-ratio adaptation within the delivery envelope. |

## Scope limits

This is a consistency review of the written architecture against its binding feature contract. It does not establish runtime correctness, performance, layout quality or the suitability of a particular future geometry implementation. Those remain implementation acceptance obligations, as recorded in Deferred. Exact internal action/payload representation and proxy priority are not findings because their public authority and implementation owner are already fixed.

No source document or spine was edited by this review.
