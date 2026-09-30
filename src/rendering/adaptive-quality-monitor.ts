import type { QualityPreference } from '../experience/experience-state';
import type { QualityTier } from '../experience/quality';

export class AdaptiveQualityMonitor {
  private readonly frameSamples: number[] = [];
  private lastFrameAt = performance.now();
  private adapted = false;

  sample(preference: QualityPreference, nowMs: number): QualityTier | null {
    const delta = nowMs - this.lastFrameAt;
    this.lastFrameAt = nowMs;
    if (delta <= 0 || delta > 500) return null;
    this.frameSamples.push(delta);
    if (this.frameSamples.length < 180) return null;
    const average = this.frameSamples.reduce((sum, sample) => sum + sample, 0)
      / this.frameSamples.length;
    this.frameSamples.length = 0;
    if (preference !== 'auto' || average <= 25 || this.adapted) return null;
    this.adapted = true;
    return 'balanced';
  }
}
