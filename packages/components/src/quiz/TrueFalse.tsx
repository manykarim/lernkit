import { type ReactNode, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useQuizContext } from './context.js';
import type { QuestionResult } from './types.js';

export interface TrueFalseProps {
  readonly id: string;
  readonly prompt: ReactNode;
  readonly correctAnswer: boolean;
  readonly trueLabel?: string;
  readonly falseLabel?: string;
  readonly explanation?: ReactNode;
}

/**
 * True/false question. Mechanically an MCQ with exactly two options — kept as
 * a separate component so authors (and the xAPI emitter) can identify the
 * interaction as `type: "true-false"` without metadata inspection.
 */
export function TrueFalse({
  id,
  prompt,
  correctAnswer,
  trueLabel = 'True',
  falseLabel = 'False',
  explanation,
}: TrueFalseProps): ReactNode {
  const ctx = useQuizContext();
  const groupId = useId();
  const [selected, setSelected] = useState<boolean | null>(null);
  const selectedRef = useRef<boolean | null>(null);
  selectedRef.current = selected;

  const getResult = useCallback((): QuestionResult => {
    const response = selectedRef.current;
    const correctResponseStr = correctAnswer ? 'true' : 'false';
    if (response === null) {
      return { id, correct: false, response: '', correctResponse: correctResponseStr };
    }
    return {
      id,
      correct: response === correctAnswer,
      response: response ? 'true' : 'false',
      correctResponse: correctResponseStr,
    };
  }, [id, correctAnswer]);

  const registration = useMemo(() => ({ id, getResult }), [id, getResult]);

  useEffect(() => {
    if (!ctx) return undefined;
    return ctx.register(registration);
  }, [ctx, registration]);

  const isGraded = ctx?.status === 'graded';
  const finalResult = isGraded ? getResult() : null;

  return (
    <li data-lernkit-tf={id} className="lernkit-tf" aria-labelledby={`${groupId}-prompt`}>
      <fieldset disabled={isGraded} className="lernkit-tf__fieldset">
        <legend id={`${groupId}-prompt`} className="lernkit-tf__prompt">
          {prompt}
        </legend>
        <div className="lernkit-tf__choices" role="radiogroup">
          {(
            [
              { value: true, label: trueLabel, key: 'true' },
              { value: false, label: falseLabel, key: 'false' },
            ] as const
          ).map((c) => {
            const optionId = `${groupId}-${c.key}`;
            return (
              <span key={c.key} className="lernkit-tf__choice">
                <input
                  id={optionId}
                  type="radio"
                  name={groupId}
                  value={c.key}
                  checked={selected === c.value}
                  onChange={() => setSelected(c.value)}
                  data-testid={`${id}-option-${c.key}`}
                />
                <label htmlFor={optionId}>{c.label}</label>
              </span>
            );
          })}
        </div>
      </fieldset>
      {isGraded && finalResult ? (
        <TrueFalseFeedback
          result={finalResult}
          trueLabel={trueLabel}
          falseLabel={falseLabel}
          explanation={explanation}
        />
      ) : null}
    </li>
  );
}

interface TrueFalseFeedbackProps {
  readonly result: QuestionResult;
  readonly trueLabel: string;
  readonly falseLabel: string;
  readonly explanation?: ReactNode;
}

function TrueFalseFeedback({ result, trueLabel, falseLabel, explanation }: TrueFalseFeedbackProps): ReactNode {
  const correctLabel = result.correctResponse === 'true' ? trueLabel : falseLabel;
  return (
    <output className="lernkit-tf__feedback" data-correct={result.correct}>
      {result.correct ? (
        <p>✓ Correct.</p>
      ) : (
        <p>
          ✗ The correct answer was <em>{correctLabel}</em>.
        </p>
      )}
      {explanation ? <div className="lernkit-tf__explanation">{explanation}</div> : null}
    </output>
  );
}
