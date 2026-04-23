import { Quiz, MCQ, TrueFalse } from '@lernkit/components';
import { XapiStubAdapter } from '@lernkit/tracker';
import { useMemo, useRef, useState, type ReactElement } from 'react';

/**
 * Sample quiz island. In Astro this is hydrated on the client with
 * `client:visible` — it appears inline in the sample-course MDX page.
 *
 * The tracker is a fresh `XapiStubAdapter` per page mount so the quiz emits
 * real xAPI 2.0 statements into an in-memory queue. The panel below the quiz
 * re-renders that queue after submit so authors can eyeball the wire format.
 *
 * Inside a SCORM 1.2 package produced by `@lernkit/packagers`, the tracker
 * would be `LernkitScorm12Adapter` instead — same contract, different wire.
 */
export default function PythonIntroQuiz(): ReactElement {
  const tracker = useMemo(() => new XapiStubAdapter('python-intro-check'), []);
  const initOnce = useRef(false);
  const [statements, setStatements] = useState(() => tracker.statements);

  if (!initOnce.current) {
    initOnce.current = true;
    void tracker.init().then(() => setStatements(tracker.statements));
  }

  return (
    <div className="lernkit-demo">
      <Quiz
        id="python-intro-check"
        title="Check: Python basics"
        passingScore={0.5}
        tracker={tracker}
        onGraded={() => setStatements(tracker.statements)}
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

      <details className="lernkit-demo__xapi">
        <summary>
          xAPI statements emitted ({statements.length})
        </summary>
        <pre aria-label="xAPI statement queue">
          <code>{JSON.stringify(statements, null, 2)}</code>
        </pre>
      </details>
    </div>
  );
}
