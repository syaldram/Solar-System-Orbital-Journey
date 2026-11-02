# Baseline reconciliation

Verdict: revise two boundary phrases; the scientific, delivery and privacy contracts otherwise reconcile.

Inputs: `docs/PRD.md`, `docs/SCIENCE.md`, `docs/agents/architecture.md`, `docs/agents/testing.md`; reality checks in `src/experience/experience-state.ts`, `src/interface/app-interface.ts`, and `src/rendering/scene-camera-controller.ts`.

## Findings

1. **High — AD-7 hard-codes Heliosphere behavior into a shared schematic lifecycle.** Its rule at spine line 86 says focus goes to Explore Heliosphere on Back and Reset uses the cutaway overview. AD-7 also governs the Gravity integration through AD-2's shared mode model. PRD section 6 requires Gravity Back to focus its own entry control, and Gravity Reset to restore its still oblique overview. Existing interface line 233 focuses `enter-gravity` on exit; camera controller lines 114–116 choose the Gravity composition. A generic implementation following the literal AD-7 rule could regress Gravity while obeying the new shared protocol. **Fix:** qualify those outcomes by presentation: each Back targets that presentation's entry button; Reset selects that presentation's overview, specifically Gravity's oblique sheet and Heliosphere's full cutaway.

2. **Low — AD-8's resource ownership phrase is broader than AD-1's UI boundary.** At line 92, renderer ownership of all “feature GPU/DOM resources” could include semantic interface controls/panels, which AD-1 and the baseline assign to Interface. Rendering currently creates scene-label DOM, so owning its own DOM is appropriate. **Fix:** say renderer owns resources it creates, including GPU objects and projected scene labels; interface owns its semantic control/panel DOM and associated listeners. Each owner disposes its own resources.

## Preserved

- Pure astronomy and DOM-free deterministic experience; thin composition root and construction-time WebGL fallback.
- Existing planetary UTC and isolated Galactic elapsed time; no fourth scientific frame or astronomy feedback from compressed schematic positions.
- Gravity's independent surface mapping, scientific-view scale contracts, physical information values, return session and preference/URL exclusions.
- Static repository-subpath delivery, existing environments/pipeline, private operation, source credits and asset manifest obligations.
- Existing transfer/FPS targets and quality adaptation without scientific degradation.
- Repository testing and feature acceptance matrix remain binding; documentation-only validation is explicitly distinguished from unverified implementation/performance outcomes.

No source or implementation changes were made by this review.
