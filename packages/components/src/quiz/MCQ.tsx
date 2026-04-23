import { type ReactNode, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useQuizContext } from './context.js';
import type { QuestionResult } from './types.js';

export interface MCQOption {
  readonly id: string;
  readonly label: string;
}

export interface MCQProps {
  /** Stable ID within the parent Quiz. Used in xAPI statements as `<quiz-id>:<question-id>`. */
  readonly id: string;
  /** The question text. */
  readonly prompt: ReactNode;
  /** At least two options; IDs must be unique within this question. */
  readonly options: readonly MCQOption[];
  /** The ID of the correct option. */
  readonly correctOptionId: string;
  /** Optional explanation shown after the quiz is graded, regardless of correctness. */
  readonly explanation?: ReactNode;
}

/**
 * Multiple-choice question — single-answer (radio-style). For multi-select, use `<MultiResponse>`
 * (lands in the next slice).
 *
 * The component registers itself with the parent `<Quiz>` at mount and unregisters on unmount.
 * At grade time, the Quiz polls each child via `getResult()` — this keeps the data flow
 * bottom-up without per-change parent re-renders.
 */
export function MCQ({ id, prompt, options, correctOptionId, explanation }: MCQProps): ReactNode {
  if (options.length < 2) {
    throw new Error(`MCQ "${id}" must have at least two options; got ${options.length}.`);
  }
  if (!options.some((o) => o.id === correctOptionId)) {
    throw new Error(`MCQ "${id}" correctOptionId "${correctOptionId}" does not match any option id.`);
  }

  const ctx = useQuizContext();
  const groupId = useId();
  const [selected, setSelected] = useState<string | null>(null);
  const selectedRef = useRef<string | null>(null);
  selectedRef.current = selected;

  const getResult = useCallback((): QuestionResult | null => {
    const response = selectedRef.current;
    if (response === null) {
      return {
        id,
        correct: false,
        response: '',
        correctResponse: correctOptionId,
      };
    }
    return {
      id,
      correct: response === correctOptionId,
      response,
      correctResponse: correctOptionId,
    };
  }, [id, correctOptionId]);

  const registration = useMemo(() => ({ id, getResult }), [id, getResult]);

  useEffect(() => {
    if (!ctx) return undefined;
    return ctx.register(registration);
  }, [ctx, registration]);

  const isGraded = ctx?.status === 'graded';
  const finalResult = isGraded ? getResult() : null;

  return (
    <li data-lernkit-mcq={id} className="lernkit-mcq" aria-labelledby={`${groupId}-prompt`}>
      <fieldset disabled={isGraded} className="lernkit-mcq__fieldset">
        <legend id={`${groupId}-prompt`} className="lernkit-mcq__prompt">
          {prompt}
        </legend>
        <ul className="lernkit-mcq__options" role="radiogroup">
          {options.map((o) => {
            const optionId = `${groupId}-${o.id}`;
            return (
              <li key={o.id} className="lernkit-mcq__option">
                <input
                  id={optionId}
                  type="radio"
                  name={groupId}
                  value={o.id}
                  checked={selected === o.id}
                  onChange={() => setSelected(o.id)}
                  data-testid={`${id}-option-${o.id}`}
                />
                <label htmlFor={optionId}>{o.label}</label>
              </li>
            );
          })}
        </ul>
      </fieldset>
      {isGraded && finalResult ? (
        <MCQFeedback result={finalResult} options={options} explanation={explanation} />
      ) : null}
    </li>
  );
}

interface MCQFeedbackProps {
  readonly result: QuestionResult;
  readonly options: readonly MCQOption[];
  readonly explanation?: ReactNode;
}

function MCQFeedback({ result, options, explanation }: MCQFeedbackProps): ReactNode {
  const correctOption = options.find((o) => o.id === result.correctResponse);
  const pickedOption = options.find((o) => o.id === result.response);
  return (
    <output className="lernkit-mcq__feedback" data-correct={result.correct}>
      {result.correct ? (
        <p>✓ Correct.</p>
      ) : (
        <p>
          ✗ Not quite.{' '}
          {pickedOption ? (
            <>
              You picked <em>{pickedOption.label}</em>.
            </>
          ) : (
            <>No answer given.</>
          )}{' '}
          The correct answer was <em>{correctOption?.label ?? '(unknown)'}</em>.
        </p>
      )}
      {explanation ? <div className="lernkit-mcq__explanation">{explanation}</div> : null}
    </output>
  );
}
