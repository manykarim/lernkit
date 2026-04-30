import { Quiz, MCQ, TrueFalse } from '@lernkit/components';
import { useMemo, useRef, useState, type ReactElement } from 'react';
import { pickTracker } from '../lib/pick-tracker';

/**
 * Sample quiz island. In Astro this is hydrated on the client with
 * `client:visible` — it appears inline in the sample-course MDX page.
 *
 * The tracker is selected at runtime by `pickTracker`: inside a SCORM 1.2
 * package the LMS-bridge adapter is used; in dev preview / plain web we fall
 * back to the in-memory xAPI stub so authors can still eyeball the wire format
 * in the panel below the quiz.
 */
export default function PythonIntroQuiz(): ReactElement {
  const picked = useMemo(() => pickTracker('python-intro-check'), []);
  const tracker = picked.tracker;
  const initOnce = useRef(false);
  const [statements, setStatements] = useState(() =>
    picked.kind === 'xapi-stub' ? picked.tracker.statements : [],
  );

  if (!initOnce.current) {
    initOnce.current = true;
    void tracker.init().then(() => {
      if (picked.kind === 'xapi-stub') setStatements(picked.tracker.statements);
    });
  }

  return (
    <div className="lernkit-demo">
      <Quiz
        id="python-intro-check"
        title="Check: Python basics"
        passingScore={0.5}
        tracker={tracker}
        onGraded={() => {
          if (picked.kind === 'xapi-stub') setStatements(picked.tracker.statements);
        }}
      >
        <MCQ
          id="fn-keyword"
          prompt="Which keyword defines a function in Python?"
          options={[
            { id: 'a', label: 'function' },
            { id: 'b', label: 'def' },
            { id: 'c', label: 'fn' },
            { id: 'd', label: 'lambda' },
          ]}
          correctOptionId="b"
          explanation="Python uses `def` to declare functions. `lambda` creates an anonymous function but isn't the keyword you'd use for a named one."
        />
        <TrueFalse
          id="lists-ordered"
          prompt="Python lists preserve insertion order."
          correctAnswer={true}
          explanation="Yes — Python lists are ordered sequences. (Since CPython 3.7, dict also preserves insertion order.)"
        />
      </Quiz>

      {picked.kind === 'xapi-stub' ? (
        <details className="lernkit-demo__xapi">
          <summary>xAPI statements emitted ({statements.length})</summary>
          <pre aria-label="xAPI statement queue">
            <code>{JSON.stringify(statements, null, 2)}</code>
          </pre>
        </details>
      ) : null}
    </div>
  );
}
