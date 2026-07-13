export type PresentationFrameLimit = 60 | 120 | 'unlimited';

const MAX_EARLY_MARGIN_MS = 1;
const EARLY_MARGIN_RATIO = 0.125;

/**
 * Aligns capped presentation to an ideal deadline timeline instead of measuring
 * from the last RAF that happened to render. A small early margin absorbs RAF
 * timestamp jitter without allowing timing error to accumulate between frames.
 */
export class PresentationFrameScheduler {
  private limit: PresentationFrameLimit | null = null;
  private nextDeadlineMs: number | null = null;
  private lastTimestampMs: number | null = null;

  shouldRender(timestampMs: number, limit: PresentationFrameLimit): boolean {
    if (!Number.isFinite(timestampMs)) return false;

    if (limit === 'unlimited') {
      this.limit = limit;
      this.nextDeadlineMs = null;
      this.lastTimestampMs = timestampMs;
      return true;
    }

    const intervalMs = 1_000 / limit;
    const timelineReset =
      this.limit !== limit ||
      this.nextDeadlineMs === null ||
      this.lastTimestampMs === null ||
      timestampMs < this.lastTimestampMs;
    this.lastTimestampMs = timestampMs;
    this.limit = limit;

    if (timelineReset) {
      this.nextDeadlineMs = timestampMs + intervalMs;
      return true;
    }

    const deadlineMs = this.nextDeadlineMs as number;
    const earlyMarginMs = Math.min(MAX_EARLY_MARGIN_MS, intervalMs * EARLY_MARGIN_RATIO);
    if (timestampMs < deadlineMs - earlyMarginMs) return false;

    const deadlinesPassed = Math.max(1, Math.ceil((timestampMs + earlyMarginMs - deadlineMs) / intervalMs));
    this.nextDeadlineMs = deadlineMs + deadlinesPassed * intervalMs;
    return true;
  }

  reset(): void {
    this.limit = null;
    this.nextDeadlineMs = null;
    this.lastTimestampMs = null;
  }
}
