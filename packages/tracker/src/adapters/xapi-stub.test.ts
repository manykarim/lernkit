import { describe, expect, it } from 'vitest';
import { XapiStubAdapter } from './xapi-stub.js';

function deterministic() {
  let i = 0;
  return new XapiStubAdapter('lesson-1', {
    idGenerator: () => `id-${++i}`,
    timestampGenerator: () => '2026-04-22T00:00:00.000Z',
  });
}

describe('XapiStubAdapter', () => {
  it('emits an `initialized` statement on init()', async () => {
    const t = deterministic();
    await t.init();
    expect(t.statements).toHaveLength(1);
    expect(t.statements[0]?.verb.id).toBe('http://adlnet.gov/expapi/verbs/initialized');
    expect(t.statements[0]?.object.id).toBe('https://lernkit.dev/activity/lesson-1');
  });

  it('emits an `answered` statement per recordInteraction with the correct interactionType', async () => {
    const t = deterministic();
    await t.init();
    await t.recordInteraction({
      id: 'q1',
      type: 'choice',
      learnerResponse: 'a',
      correctResponse: 'b',
      correct: false,
      timestamp: '2026-04-22T00:00:00Z',
    });
    const s = t.statements.at(-1);
    expect(s?.verb.id).toBe('http://adlnet.gov/expapi/verbs/answered');
    expect(s?.object.id).toBe('https://lernkit.dev/activity/lesson-1/interaction/q1');
    expect(s?.object.definition?.interactionType).toBe('choice');
    expect(s?.object.definition?.correctResponsesPattern).toEqual(['b']);
    expect(s?.result?.response).toBe('a');
    expect(s?.result?.success).toBe(false);
  });

  it('attaches `result.score` to the `completed`/`passed`/`failed` statements', async () => {
    const t = deterministic();
    await t.init();
    await t.setScore({ scaled: 0.9, raw: 9, min: 0, max: 10 });
    await t.complete();
    await t.pass();

    const completed = t.statements.find((s) => s.verb.id.endsWith('/completed'));
    const passed = t.statements.find((s) => s.verb.id.endsWith('/passed'));
    expect(completed?.result?.score?.scaled).toBe(0.9);
    expect(completed?.result?.completion).toBe(true);
    expect(passed?.result?.score?.scaled).toBe(0.9);
    expect(passed?.result?.success).toBe(true);
  });

  it('emits `failed` with success=false and no completion flip', async () => {
    const t = deterministic();
    await t.init();
    await t.setScore({ scaled: 0.3 });
    await t.fail();
    const failed = t.statements.find((s) => s.verb.id.endsWith('/failed'));
    expect(failed?.result?.success).toBe(false);
    expect(failed?.result?.score?.scaled).toBe(0.3);
  });

  it('rejects out-of-range scaled scores', async () => {
    const t = deterministic();
    await t.init();
    await expect(t.setScore({ scaled: 1.2 })).rejects.toThrow(RangeError);
    await expect(t.setScore({ scaled: -0.1 })).rejects.toThrow(RangeError);
  });

  it('emits `terminated` once and then blocks further calls', async () => {
    const t = deterministic();
    await t.init();
    await t.terminate();
    const last = t.statements.at(-1);
    expect(last?.verb.id).toBe('http://adlnet.gov/expapi/verbs/terminated');
    await expect(t.setProgress(0.5)).rejects.toThrow(/terminated/i);
    await t.terminate(); // idempotent
    expect(t.statements.filter((s) => s.verb.id.endsWith('/terminated'))).toHaveLength(1);
  });

  it('invokes the onStatement callback synchronously on each emit', async () => {
    const seen: string[] = [];
    const t = new XapiStubAdapter('lesson-2', {
      onStatement: (s) => seen.push(s.verb.id),
      idGenerator: () => 'x',
      timestampGenerator: () => '2026-04-22T00:00:00Z',
    });
    await t.init();
    await t.complete();
    expect(seen).toEqual(['http://adlnet.gov/expapi/verbs/initialized', 'http://adlnet.gov/expapi/verbs/completed']);
  });

  it('serialises statements to JSON with the fields an LRS expects', async () => {
    const t = deterministic();
    await t.init();
    const serialised = JSON.stringify(t.statements[0]);
    const parsed = JSON.parse(serialised);
    expect(parsed).toMatchObject({
      id: 'id-1',
      actor: { account: { name: 'anonymous', homePage: 'https://lernkit.dev/actors' } },
      verb: { id: 'http://adlnet.gov/expapi/verbs/initialized', display: { 'en-US': 'initialized' } },
      object: { id: 'https://lernkit.dev/activity/lesson-1', objectType: 'Activity' },
      timestamp: '2026-04-22T00:00:00.000Z',
    });
  });

  it('clearStatements() empties the queue', async () => {
    const t = deterministic();
    await t.init();
    expect(t.statements).toHaveLength(1);
    t.clearStatements();
    expect(t.statements).toHaveLength(0);
  });
});
