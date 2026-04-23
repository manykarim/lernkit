import { NoopAdapter } from '@lernkit/tracker';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MCQ } from './MCQ.js';
import { Quiz } from './Quiz.js';
import { TrueFalse } from './TrueFalse.js';

afterEach(() => {
  cleanup();
});

describe('Quiz', () => {
  it('renders the title, questions, and a Submit button by default', () => {
    render(
      <Quiz id="q1" title="Sample Quiz">
        <MCQ
          id="m1"
          prompt="Pick one"
          options={[
            { id: 'a', label: 'A' },
            { id: 'b', label: 'B' },
          ]}
          correctOptionId="a"
        />
      </Quiz>,
    );
    expect(screen.getByText('Sample Quiz')).toBeDefined();
    expect(screen.getByTestId('q1-submit')).toBeDefined();
  });

  it('grades an all-correct quiz and reports passed=true with scaled=1', async () => {
    const onGraded = vi.fn();
    render(
      <Quiz id="q1" passingScore={0.8} onGraded={onGraded}>
        <MCQ
          id="m1"
          prompt="Pick B"
          options={[
            { id: 'a', label: 'A' },
            { id: 'b', label: 'B' },
          ]}
          correctOptionId="b"
        />
        <TrueFalse id="t1" prompt="The sky is blue." correctAnswer={true} />
      </Quiz>,
    );
    fireEvent.click(screen.getByTestId('m1-option-b'));
    fireEvent.click(screen.getByTestId('t1-option-true'));

    await act(async () => {
      fireEvent.click(screen.getByTestId('q1-submit'));
    });

    expect(onGraded).toHaveBeenCalledTimes(1);
    const report = onGraded.mock.calls[0]?.[0];
    expect(report).toMatchObject({
      totalQuestions: 2,
      correctCount: 2,
      scaledScore: 1,
      passed: true,
    });
  });

  it('flags a sub-threshold result as passed=false', async () => {
    const onGraded = vi.fn();
    render(
      <Quiz id="q1" passingScore={0.8} onGraded={onGraded}>
        <MCQ
          id="m1"
          prompt="Pick B"
          options={[
            { id: 'a', label: 'A' },
            { id: 'b', label: 'B' },
          ]}
          correctOptionId="b"
        />
        <TrueFalse id="t1" prompt="Claim" correctAnswer={true} />
      </Quiz>,
    );
    // Pick the wrong option for the MCQ, correct for TF. 1/2 = 0.5 < 0.8.
    fireEvent.click(screen.getByTestId('m1-option-a'));
    fireEvent.click(screen.getByTestId('t1-option-true'));
    await act(async () => {
      fireEvent.click(screen.getByTestId('q1-submit'));
    });

    const report = onGraded.mock.calls[0]?.[0];
    expect(report).toMatchObject({ correctCount: 1, scaledScore: 0.5, passed: false });
  });

  it('treats unanswered questions as wrong (scaled=0 if all skipped)', async () => {
    const onGraded = vi.fn();
    render(
      <Quiz id="q1" onGraded={onGraded}>
        <TrueFalse id="t1" prompt="Claim" correctAnswer={true} />
      </Quiz>,
    );
    await act(async () => {
      fireEvent.click(screen.getByTestId('q1-submit'));
    });
    expect(onGraded.mock.calls[0]?.[0]).toMatchObject({
      totalQuestions: 1,
      correctCount: 0,
      scaledScore: 0,
      passed: false,
    });
  });

  it('drives the Tracker: records interactions, sets the score, and passes on success', async () => {
    const tracker = new NoopAdapter();
    await tracker.init();

    render(
      <Quiz id="q1" passingScore={0.5} tracker={tracker}>
        <MCQ
          id="m1"
          prompt="Pick A"
          options={[
            { id: 'a', label: 'A' },
            { id: 'b', label: 'B' },
          ]}
          correctOptionId="a"
        />
      </Quiz>,
    );
    fireEvent.click(screen.getByTestId('m1-option-a'));
    await act(async () => {
      fireEvent.click(screen.getByTestId('q1-submit'));
    });

    const state = tracker.state;
    expect(state.completion).toBe('completed');
    expect(state.success).toBe('passed');
    expect(state.score?.scaled).toBe(1);
    // One interaction recorded with the prefixed compound id.
    expect(tracker.interactions.map((i) => i.id)).toEqual(['q1:m1']);
    expect(tracker.interactions[0]?.correct).toBe(true);
    expect(tracker.interactions[0]?.type).toBe('choice');
  });

  it('drives the Tracker on failure: fail() is called, not pass()', async () => {
    const tracker = new NoopAdapter();
    await tracker.init();

    render(
      <Quiz id="q1" passingScore={0.8} tracker={tracker}>
        <TrueFalse id="t1" prompt="Claim" correctAnswer={true} />
      </Quiz>,
    );
    // Wrong answer
    fireEvent.click(screen.getByTestId('t1-option-false'));
    await act(async () => {
      fireEvent.click(screen.getByTestId('q1-submit'));
    });

    // init() flipped completion from not-attempted → incomplete; fail() does NOT flip it further.
    expect(tracker.state.completion).toBe('incomplete');
    expect(tracker.state.success).toBe('failed');
    expect(tracker.state.score?.scaled).toBe(0);
  });

  it('disables questions after grading (fieldset disabled)', async () => {
    const { container } = render(
      <Quiz id="q1">
        <TrueFalse id="t1" prompt="Claim" correctAnswer={true} />
      </Quiz>,
    );
    fireEvent.click(screen.getByTestId('t1-option-true'));
    await act(async () => {
      fireEvent.click(screen.getByTestId('q1-submit'));
    });
    // fieldset.disabled reflects the attribute; child input "effective disabled" is a CSS pseudo, not a DOM prop.
    const fieldset = container.querySelector('.lernkit-tf__fieldset') as HTMLFieldSetElement | null;
    expect(fieldset?.disabled).toBe(true);
  });
});
