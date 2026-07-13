import { describe, expect, it } from 'vitest';
import { PresentationFrameScheduler, type PresentationFrameLimit } from './PresentationFrameScheduler';

describe('presentation frame scheduler', () => {
  it('avoids a third 120 Hz refresh when limiting slightly early callbacks to 60 FPS', () => {
    const rendered = renderTimestamps([0, 8.1, 16.2, 24.6, 32.9, 41.2, 49.5, 57.9, 66.2], 60);

    expect(rendered).toEqual([0, 16.2, 32.9, 49.5, 66.2]);
    expect(frameGaps(rendered).every((gap) => gap < 20)).toBe(true);
  });

  it('carries ideal deadlines forward without accumulating callback jitter', () => {
    const timestamps = [0, 8.05, 16.45, 24.7, 33.1, 41.35, 49.75, 58, 66.4];

    expect(renderTimestamps(timestamps, 120)).toEqual(timestamps);
  });

  it('renders every callback when unlimited', () => {
    const timestamps = [0, 3, 7, 12, 19];

    expect(renderTimestamps(timestamps, 'unlimited')).toEqual(timestamps);
  });

  it('renders immediately and recalibrates after a limit change or backwards timestamp', () => {
    const scheduler = new PresentationFrameScheduler();

    expect(scheduler.shouldRender(0, 60)).toBe(true);
    expect(scheduler.shouldRender(8, 60)).toBe(false);
    expect(scheduler.shouldRender(9, 120)).toBe(true);
    expect(scheduler.shouldRender(3, 120)).toBe(true);
  });

  it('skips missed deadlines after a long stall instead of issuing catch-up frames', () => {
    const scheduler = new PresentationFrameScheduler();

    expect(scheduler.shouldRender(0, 60)).toBe(true);
    expect(scheduler.shouldRender(100, 60)).toBe(true);
    expect(scheduler.shouldRender(101, 60)).toBe(false);
    expect(scheduler.shouldRender(116, 60)).toBe(true);
  });
});

function renderTimestamps(timestamps: readonly number[], limit: PresentationFrameLimit): number[] {
  const scheduler = new PresentationFrameScheduler();
  return timestamps.filter((timestamp) => scheduler.shouldRender(timestamp, limit));
}

function frameGaps(timestamps: readonly number[]): number[] {
  return timestamps.slice(1).map((timestamp, index) => timestamp - timestamps[index]!);
}
