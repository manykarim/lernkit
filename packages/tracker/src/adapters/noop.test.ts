import { describe, expect, it } from 'vitest';
import { NoopAdapter } from './noop.js';

describe('NoopAdapter', () => {
  it('initializes to a clean state', async () => {
    const t = new NoopAdapter();
    expect(t.state).toEqual({
      completion: 'not-attempted',
      success: 'unknown',
      progress: 0,
      score: undefined,
      bookmark: undefined,
    });
  });

  it('init() flips completion to incomplete and returns true', async () => {
    const t = new NoopAdapter();
    await expect(t.init()).resolves.toBe(true);
    expect(t.state.completion).toBe('incomplete');
  });

  it('clamps progress into [0, 1]', async () => {
    const t = new NoopAdapter();
    await t.setProgress(-5);
    expect(t.state.progress).toBe(0);
    await t.setProgress(42);
    expect(t.state.progress).toBe(1);
    await t.setProgress(0.37);
    expect(t.state.progress).toBe(0.37);
  });

  it('rejects out-of-range scaled scores', async () => {
    const t = new NoopAdapter();
    await expect(t.setScore({ scaled: 1.2 })).rejects.toThrow(RangeError);
    await expect(t.setScore({ scaled: -0.1 })).rejects.toThrow(RangeError);
  });

  it('records interactions in order', async () => {
    const t = new NoopAdapter();
    await t.recordInteraction({
      id: 'q1',
      type: 'choice',
      learnerResponse: 'a',
      correct: true,
      timestamp: '2026-04-22T00:00:00Z',
    });
    await t.recordInteraction({
      id: 'q2',
      type: 'true-false',
      learnerResponse: 'true',
      correct: false,
      timestamp: '2026-04-22T00:00:01Z',
    });
    expect(t.interactions).toHaveLength(2);
    expect(t.interactions[0]?.id).toBe('q1');
    expect(t.interactions[1]?.correct).toBe(false);
  });

  it('complete() sets completion=completed', async () => {
    const t = new NoopAdapter();
    await t.complete();
    expect(t.state.completion).toBe('completed');
  });

  it('pass() and fail() set success independent of completion', async () => {
    const t = new NoopAdapter();
    await t.pass();
    expect(t.state.success).toBe('passed');
    await t.fail();
    expect(t.state.success).toBe('failed');
    expect(t.state.completion).toBe('not-attempted');
  });

  it('rejects further calls after terminate()', async () => {
    const t = new NoopAdapter();
    await t.init();
    await t.terminate();
    await expect(t.setProgress(0.5)).rejects.toThrow(/terminated/i);
    await expect(t.complete()).rejects.toThrow(/terminated/i);
  });

  it('terminate() is idempotent', async () => {
    const t = new NoopAdapter();
    await expect(t.terminate()).resolves.toBeUndefined();
    await expect(t.terminate()).resolves.toBeUndefined();
  });
});
