import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { MCQ } from './MCQ.js';
import { Quiz } from './Quiz.js';

afterEach(() => {
  cleanup();
});

describe('MCQ', () => {
  it('throws at render time if given fewer than 2 options', () => {
    expect(() =>
      render(
        <Quiz id="q">
          <MCQ id="m" prompt="?" options={[{ id: 'a', label: 'A' }]} correctOptionId="a" />
        </Quiz>,
      ),
    ).toThrow(/at least two options/);
  });

  it('throws at render time if correctOptionId does not match any option', () => {
    expect(() =>
      render(
        <Quiz id="q">
          <MCQ
            id="m"
            prompt="?"
            options={[
              { id: 'a', label: 'A' },
              { id: 'b', label: 'B' },
            ]}
            correctOptionId="c"
          />
        </Quiz>,
      ),
    ).toThrow(/does not match any option id/);
  });

  it('renders one radio input per option with accessible labels', () => {
    render(
      <Quiz id="q1">
        <MCQ
          id="m1"
          prompt="Pick"
          options={[
            { id: 'a', label: 'Apple' },
            { id: 'b', label: 'Banana' },
            { id: 'c', label: 'Cherry' },
          ]}
          correctOptionId="a"
        />
      </Quiz>,
    );
    expect(screen.getByLabelText('Apple')).toBeDefined();
    expect(screen.getByLabelText('Banana')).toBeDefined();
    expect(screen.getByLabelText('Cherry')).toBeDefined();
  });
});
