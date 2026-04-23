import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Quiz } from './Quiz.js';
import { TrueFalse } from './TrueFalse.js';

afterEach(() => {
  cleanup();
});

describe('TrueFalse', () => {
  it('renders two radio buttons with the default True/False labels', () => {
    render(
      <Quiz id="q">
        <TrueFalse id="t" prompt="Claim" correctAnswer={true} />
      </Quiz>,
    );
    expect(screen.getByLabelText('True')).toBeDefined();
    expect(screen.getByLabelText('False')).toBeDefined();
  });

  it('accepts custom labels for each choice', () => {
    render(
      <Quiz id="q">
        <TrueFalse id="t" prompt="?" correctAnswer={true} trueLabel="Yes" falseLabel="No" />
      </Quiz>,
    );
    expect(screen.getByLabelText('Yes')).toBeDefined();
    expect(screen.getByLabelText('No')).toBeDefined();
  });

  it('marks the true choice correct only when the learner picked true (and vice versa)', async () => {
    const { getByTestId, container } = render(
      <Quiz id="q" passingScore={0.5}>
        <TrueFalse id="t" prompt="?" correctAnswer={true} />
      </Quiz>,
    );
    fireEvent.click(getByTestId('t-option-true'));
    await act(async () => {
      fireEvent.click(getByTestId('q-submit'));
    });
    const tfFeedback = container.querySelector('.lernkit-tf__feedback');
    expect(tfFeedback?.getAttribute('data-correct')).toBe('true');
    expect(tfFeedback?.textContent).toContain('Correct');
  });

  it('reports failure and surfaces the correct answer', async () => {
    const { getByTestId, container } = render(
      <Quiz id="q" passingScore={0.5}>
        <TrueFalse id="t" prompt="?" correctAnswer={false} />
      </Quiz>,
    );
    fireEvent.click(getByTestId('t-option-true'));
    await act(async () => {
      fireEvent.click(getByTestId('q-submit'));
    });
    const tfFeedback = container.querySelector('.lernkit-tf__feedback');
    expect(tfFeedback?.getAttribute('data-correct')).toBe('false');
    expect(tfFeedback?.textContent).toMatch(/correct answer was/i);
  });
});
