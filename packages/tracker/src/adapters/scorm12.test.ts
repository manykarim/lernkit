import { describe, expect, it, vi } from 'vitest';
import { LernkitScorm12Adapter } from './scorm12.js';

function makeRuntime(overrides: Partial<ReturnType<typeof baseRuntime>> = {}) {
  const base = baseRuntime();
  return { ...base, ...overrides };
}

function baseRuntime() {
  return {
    available: true,
    status: vi.fn(() => 'not attempted'),
    entry: vi.fn(() => 'ab-initio'),
    init: vi.fn(() => true),
    setSuspendData: vi.fn(() => true),
    setBookmark: vi.fn(() => true),
    setScore: vi.fn(() => true),
    setStatus: vi.fn(() => true),
    commit: vi.fn(() => true),
    terminate: vi.fn(() => true),
  };
}

describe('LernkitScorm12Adapter', () => {
  it('throws at construction when no runtime is available', () => {
    expect(() => new LernkitScorm12Adapter()).toThrow(/requires window.LernkitScorm12/);
  });

  it('init() returns false and does not mark initialised when runtime is unavailable', async () => {
    const rt = makeRuntime({ available: false });
    const a = new LernkitScorm12Adapter(rt);
    await expect(a.init()).resolves.toBe(false);
    expect(rt.init).not.toHaveBeenCalled();
  });

  it('init() calls runtime.init and mirrors the LMS-reported status', async () => {
    const rt = makeRuntime({ status: vi.fn(() => 'incomplete') });
    const a = new LernkitScorm12Adapter(rt);
    await a.init();
    expect(rt.init).toHaveBeenCalled();
    expect(a.state.completion).toBe('incomplete');
    expect(a.state.success).toBe('unknown');
  });

  it('setScore() clamps + rejects out-of-range and passes scaled to the runtime', async () => {
    const rt = makeRuntime();
    const a = new LernkitScorm12Adapter(rt);
    await a.init();
    await a.setScore({ scaled: 0.75 });
    expect(rt.setScore).toHaveBeenCalledWith(0.75);
    await expect(a.setScore({ scaled: -0.1 })).rejects.toThrow(RangeError);
    await expect(a.setScore({ scaled: 1.1 })).rejects.toThrow(RangeError);
  });

  it('setBookmark() uses lesson_location when short, falls back to suspend_data when > 255 chars', async () => {
    const rt = makeRuntime();
    const a = new LernkitScorm12Adapter(rt);
    await a.init();
    await a.setBookmark('short-location');
    expect(rt.setBookmark).toHaveBeenCalledWith('short-location');
    expect(rt.setSuspendData).not.toHaveBeenCalled();

    const long = 'x'.repeat(300);
    await a.setBookmark(long);
    expect(rt.setSuspendData).toHaveBeenCalled();
    const lastCall = rt.setSuspendData.mock.calls.at(-1)?.[0] ?? '';
    expect(lastCall).toContain(long.slice(0, 50));
  });

  it('setProgress() serialises into suspend_data with a progress field', async () => {
    const rt = makeRuntime();
    const a = new LernkitScorm12Adapter(rt);
    await a.init();
    await a.setProgress(0.5);
    expect(rt.setSuspendData).toHaveBeenCalled();
    const payload = rt.setSuspendData.mock.calls.at(-1)?.[0] ?? '';
    expect(JSON.parse(payload)).toEqual({ progress: 0.5 });
  });

  it('complete() / pass() write lesson_status in the caller-supplied order', async () => {
    const rt = makeRuntime();
    const a = new LernkitScorm12Adapter(rt);
    await a.init();
    await a.complete();
    await a.pass();
    const order = rt.setStatus.mock.calls.map((c) => c[0]);
    expect(order).toEqual(['completed', 'passed']);
    expect(a.state.completion).toBe('completed');
    expect(a.state.success).toBe('passed');
  });

  it('terminate() commits + finishes the SCORM session, and blocks further calls', async () => {
    const rt = makeRuntime();
    const a = new LernkitScorm12Adapter(rt);
    await a.init();
    await a.terminate();
    expect(rt.commit).toHaveBeenCalled();
    expect(rt.terminate).toHaveBeenCalled();
    await expect(a.setProgress(0.5)).rejects.toThrow(/terminated/i);
  });

  it('terminate() is idempotent', async () => {
    const rt = makeRuntime();
    const a = new LernkitScorm12Adapter(rt);
    await a.init();
    await a.terminate();
    await a.terminate();
    expect(rt.terminate).toHaveBeenCalledTimes(1);
  });

  it('requires init() before most methods', async () => {
    const rt = makeRuntime();
    const a = new LernkitScorm12Adapter(rt);
    await expect(a.setProgress(0.5)).rejects.toThrow(/init/);
    await expect(a.setScore({ scaled: 0.5 })).rejects.toThrow(/init/);
    await expect(a.complete()).rejects.toThrow(/init/);
  });
});
