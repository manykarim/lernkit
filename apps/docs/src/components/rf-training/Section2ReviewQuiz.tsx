import { MCQ, Quiz, TrueFalse } from '@lernkit/components';
import { useMemo, useRef, useState, type ReactElement } from 'react';
import { pickTracker } from '../../lib/pick-tracker';

export default function Section2ReviewQuiz(): ReactElement {
  const picked = useMemo(() => pickTracker('rf-training/section-2/review'), []);
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
        id="rf-section-2-review"
        title="Section 2 review"
        passingScore={0.7}
        tracker={tracker}
        onGraded={() => {
          if (picked.kind === 'xapi-stub') setStatements(picked.tracker.statements);
        }}
      >
        <MCQ
          id="sections"
          prompt="Which of these is NOT one of the four main sections of a `.robot` file?"
          options={[
            { id: 'a', label: '*** Settings ***' },
            { id: 'b', label: '*** Variables ***' },
            { id: 'c', label: '*** Assertions ***' },
            { id: 'd', label: '*** Keywords ***' },
          ]}
          correctOptionId="c"
          explanation="The four canonical sections are Settings, Variables, Test Cases, and Keywords. There is no Assertions section \u2014 assertion keywords live inside test cases or user-defined keywords."
        />

        <TrueFalse
          id="two-space"
          prompt="`Log Hello, world!` (one space between keyword and argument) is valid Robot Framework syntax."
          correctAnswer={false}
          explanation="Robot Framework requires at least TWO spaces to separate a keyword from its arguments. One space makes `Log Hello,` the keyword name, which doesn\u2019t exist."
        />

        <MCQ
          id="variable-types"
          prompt="Which prefix identifies a dictionary variable?"
          options={[
            { id: 'a', label: '$' },
            { id: 'b', label: '@' },
            { id: 'c', label: '&' },
            { id: 'd', label: '#' },
          ]}
          correctOptionId="c"
          explanation="`$` is scalar, `@` is list, `&` is dictionary. `#` starts a comment."
        />

        <MCQ
          id="typed-var"
          prompt="Which of these declarations makes `${count}` a real integer rather than a string?"
          options={[
            { id: 'a', label: 'VAR    ${count}    42' },
            { id: 'b', label: 'VAR    ${count: int}    42' },
            { id: 'c', label: 'VAR    int ${count}    42' },
            { id: 'd', label: 'VAR    ${count=int}    42' },
          ]}
          correctOptionId="b"
          explanation="The modern typed-variable syntax is `${name: type}`. Without the annotation, Robot Framework treats the value as a string."
        />

        <MCQ
          id="integer-compare"
          prompt="Why does `Should Be Equal ${answer} 123` sometimes fail when `${answer}` was set via `Evaluate    100 + 23`?"
          options={[
            { id: 'a', label: 'Because 123 is too large for an integer.' },
            { id: 'b', label: 'Because `Evaluate` returns a real int and `123` in the test is a string \u2014 `Should Be Equal` compares them as strings.' },
            { id: 'c', label: 'Because `Should Be Equal` does not support integers at all.' },
            { id: 'd', label: 'Because `Evaluate` always returns floats.' },
          ]}
          correctOptionId="b"
          explanation="`Should Be Equal` without a type-aware variant compares the string representations. Since the left side is an int and the right side is a string, equality fails. Use `Should Be Equal As Integers` to compare as numbers."
        />

        <TrueFalse
          id="control-end"
          prompt="`IF / ELSE`, `FOR`, and `TRY / EXCEPT` all require a closing `END`."
          correctAnswer={true}
          explanation="Every control-structure block in Robot Framework closes with `END` \u2014 no exceptions. Forgetting it is a common beginner mistake."
        />

        <MCQ
          id="for-range"
          prompt="Which keyword follows `FOR ${n}` to iterate over a list of integers from 1 to 10?"
          options={[
            { id: 'a', label: 'IN' },
            { id: 'b', label: 'IN LIST' },
            { id: 'c', label: 'IN RANGE' },
            { id: 'd', label: 'IN INTS' },
          ]}
          correctOptionId="c"
          explanation="`FOR ${n} IN RANGE 1 11` iterates 1 through 10 (upper bound is exclusive). `IN` (without RANGE) iterates an explicit list; `IN LIST` / `IN INTS` don\u2019t exist."
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
