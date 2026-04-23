import type { Tracker } from '@lernkit/tracker';
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { QuizContext, type QuizContextValue } from './context.js';
import type { QuestionRegistration, QuestionResult, QuizGradeReport, QuizStatus } from './types.js';

export interface QuizProps {
  /** Stable ID for the quiz aggregate. Becomes the activity IRI suffix in xAPI statements. */
  readonly id: string;
  /** Optional human-readable title shown above the questions. */
  readonly title?: string;
  /** Threshold for passing. Scaled 0–1. Defaults to 0.8. */
  readonly passingScore?: number;
  /** Optional tracker injection; when null the quiz still grades client-side but emits no statements. */
  readonly tracker?: Tracker | null;
  /**
   * Invoked with the final grade on Submit.
   * Useful for docs pages that want to react (e.g. unlock Next button).
   */
  readonly onGraded?: (report: QuizGradeReport) => void;
  readonly children: ReactNode;
}

/**
 * The quiz container. Renders its children (question widgets) and a Submit button.
 * On Submit: polls every registered child for its result, computes the aggregate
 * scaled score, emits interactions + score + pass/fail to the Tracker if one is
 * provided, and reports the grade via `onGraded`.
 */
export function Quiz({ id, title, passingScore = 0.8, tracker = null, onGraded, children }: QuizProps): ReactNode {
  const [status, setStatus] = useState<QuizStatus>('idle');
  const [report, setReport] = useState<QuizGradeReport | null>(null);
  const registrationsRef = useRef<Map<string, QuestionRegistration>>(new Map());

  const register = useCallback((q: QuestionRegistration) => {
    registrationsRef.current.set(q.id, q);
    return () => {
      registrationsRef.current.delete(q.id);
    };
  }, []);

  const ctx = useMemo<QuizContextValue>(() => ({ register, status, tracker }), [register, status, tracker]);

  const submit = useCallback(async () => {
    const results: QuestionResult[] = [];
    for (const q of registrationsRef.current.values()) {
      const r = q.getResult();
      if (r) results.push(r);
    }
    const totalQuestions = results.length;
    const correctCount = results.filter((r) => r.correct).length;
    const scaledScore = totalQuestions === 0 ? 0 : correctCount / totalQuestions;
    const passed = scaledScore >= passingScore;

    const grade: QuizGradeReport = {
      totalQuestions,
      correctCount,
      scaledScore,
      passed,
      perQuestion: results,
    };

    setReport(grade);
    setStatus('graded');

    if (tracker) {
      // Record each interaction, then the aggregate score, then pass/fail.
      // Order matters for SCORM 1.2 (score must precede pass/fail).
      for (const r of results) {
        await tracker.recordInteraction({
          id: `${id}:${r.id}`,
          type: 'choice',
          learnerResponse: r.response,
          correctResponse: r.correctResponse,
          correct: r.correct,
          timestamp: new Date().toISOString(),
        });
      }
      await tracker.setScore({ scaled: scaledScore, raw: correctCount, min: 0, max: totalQuestions });
      if (passed) {
        await tracker.complete();
        await tracker.pass();
      } else {
        await tracker.fail();
      }
    }

    onGraded?.(grade);
  }, [id, passingScore, tracker, onGraded]);

  useEffect(() => {
    if (status === 'idle') setStatus('answering');
  }, [status]);

  return (
    <QuizContext.Provider value={ctx}>
      <section
        data-lernkit-quiz={id}
        data-quiz-status={status}
        aria-labelledby={title ? `${id}-title` : undefined}
        className="lernkit-quiz"
      >
        {title ? (
          <h3 id={`${id}-title`} className="lernkit-quiz__title">
            {title}
          </h3>
        ) : null}

        <ol className="lernkit-quiz__questions">{children}</ol>

        {status !== 'graded' ? (
          <button
            type="button"
            className="lernkit-quiz__submit"
            onClick={() => {
              void submit();
            }}
            data-testid={`${id}-submit`}
          >
            Submit
          </button>
        ) : (
          <QuizFeedback report={report} passingScore={passingScore} />
        )}
      </section>
    </QuizContext.Provider>
  );
}

interface QuizFeedbackProps {
  readonly report: QuizGradeReport | null;
  readonly passingScore: number;
}

function QuizFeedback({ report, passingScore }: QuizFeedbackProps): ReactNode {
  if (!report) return null;
  const pct = Math.round(report.scaledScore * 100);
  const threshold = Math.round(passingScore * 100);
  return (
    <output className="lernkit-quiz__feedback">
      <p>
        <strong>{report.passed ? 'Passed' : 'Not yet'}</strong> — scored {pct}% ({report.correctCount} /{' '}
        {report.totalQuestions} correct; need {threshold}% to pass).
      </p>
    </output>
  );
}
