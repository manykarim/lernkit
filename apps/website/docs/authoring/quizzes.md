---
id: quizzes
title: Quizzes
sidebar_position: 4
---

# Quizzes

Three components from `@lernkit/components` cover most knowledge-check
needs:

- **`<Quiz>`** — container that grades a set of questions.
- **`<MCQ>`** — multiple-choice (single-answer) question.
- **`<TrueFalse>`** — boolean question. Mechanically an MCQ with two
  options; kept separate so xAPI emits `interactionType: "true-false"`.

All three are React islands. Import in MDX and use with
`client:visible`.

## Minimum viable quiz

```mdx title="rf-training/section-1-getting-started/review.mdx"
import { Quiz, MCQ, TrueFalse } from '@lernkit/components';

## Knowledge check

<Quiz id="rf-section-1-review" title="Section 1 review" passingScore={0.7} client:visible>

  <MCQ
    id="venv-purpose"
    prompt="What is the main purpose of a Python virtual environment?"
    options={[
      { id: 'a', label: 'Speed up package installation.' },
      { id: 'b', label: "Isolate a project's packages from other projects and the system Python." },
      { id: 'c', label: 'Compile Python source to machine code.' },
      { id: 'd', label: 'Encrypt installed dependencies.' },
    ]}
    correctOptionId="b"
    explanation="Virtual environments keep one project's pip-installed packages separate from every other project, so version conflicts don't bleed across projects."
  />

  <TrueFalse
    id="pip-freeze"
    prompt="`pip freeze > requirements.txt` is needed when you're using uv."
    correctAnswer={false}
    explanation="uv records dependencies automatically in `uv.lock`. A separate requirements.txt is only needed when you're on pip + venv."
  />

</Quiz>
```

What the learner sees:

- A heading (`title` prop).
- Each question rendered with radio buttons.
- A *Submit* button at the bottom.
- After submit: a pass/fail badge, percentage, and per-question explanations
  (correctness ✓ / ✗ + the `explanation` text).
- Disabled inputs after grading — the quiz is done.

## `<Quiz>`

The container. Renders its children, manages submit, computes the score,
and emits to a Tracker if one is wired.

| Prop | Type | Required | Default | Notes |
|---|---|---|---|---|
| `id` | `string` | yes | — | Stable activity ID. Becomes the suffix in the xAPI activity IRI |
| `title` | `string` | no | — | Heading rendered above the questions |
| `passingScore` | `number` | no | `0.8` | Threshold (0–1). At or above → pass; below → fail |
| `tracker` | `Tracker \| null` | no | `null` | Optional explicit tracker injection. When null, the quiz still grades client-side but emits no statements. See [`pickTracker`](/tracking/pick-tracker) for runtime selection |
| `onGraded` | `(report: QuizGradeReport) => void` | no | — | Called once per submit with the final grade — useful for unlocking a "Next" button |
| `children` | `ReactNode` | yes | — | The question components |

### `QuizGradeReport`

```ts
interface QuizGradeReport {
  totalQuestions: number;
  correctCount: number;
  scaledScore: number;       // 0–1
  passed: boolean;
  perQuestion: ReadonlyArray<{
    id: string;
    correct: boolean;
    response: string;
    correctResponse: string;
  }>;
}
```

### Wire to a Tracker

Quizzes typically use the [`pickTracker`](/tracking/pick-tracker) helper so
the right adapter is chosen at runtime:

```tsx title="apps/docs/src/components/MyQuizIsland.tsx"
import { Quiz, MCQ } from '@lernkit/components';
import { useMemo, useRef } from 'react';
import { pickTracker } from '../lib/pick-tracker';

export default function MyQuizIsland() {
  const picked = useMemo(() => pickTracker('rf-section-1/review'), []);
  const initOnce = useRef(false);
  if (!initOnce.current) {
    initOnce.current = true;
    void picked.tracker.init();
  }
  return (
    <Quiz id="rf-section-1-review" title="Review" passingScore={0.7} tracker={picked.tracker}>
      <MCQ id="q1" prompt="…" options={[…]} correctOptionId="…" />
    </Quiz>
  );
}
```

In MDX:

```mdx
import MyQuizIsland from '@/components/MyQuizIsland.tsx';

<MyQuizIsland client:visible />
```

This is the pattern the rf-training course uses for its review quizzes —
look at `apps/docs/src/components/rf-training/Section1ReviewQuiz.tsx` for
a real, complete example.

## `<MCQ>` — multiple choice (single answer)

Radio-style. Exactly one of `options` is correct, identified by
`correctOptionId`.

| Prop | Type | Required | Notes |
|---|---|---|---|
| `id` | `string` | yes | Unique within the parent `<Quiz>`. Becomes part of the xAPI interaction ID |
| `prompt` | `ReactNode` | yes | The question text. JSX accepted (e.g., `<code>` inline) |
| `options` | `readonly MCQOption[]` | yes | At least 2 options |
| `correctOptionId` | `string` | yes | Must match one of the option IDs |
| `explanation` | `ReactNode` | no | Shown after grading regardless of correctness |

### `MCQOption`

```ts
interface MCQOption {
  readonly id: string;       // unique within this question
  readonly label: string;    // shown to the learner
}
```

### Validation

The MCQ throws at render time if:

- `options.length < 2`.
- `correctOptionId` doesn't match any option's `id`.

These are author errors, not learner errors — fail loud, fix in dev.

### Inline JSX in `prompt` and `explanation`

Both accept any `ReactNode`. Useful for inline code or emphasis:

```mdx
<MCQ
  id="why-typed-var"
  prompt={
    <>
      Which of these makes <code>{`\${count}`}</code> a real integer?
    </>
  }
  options={[
    { id: 'a', label: 'VAR    ${count}    42' },
    { id: 'b', label: 'VAR    ${count: int}    42' },
  ]}
  correctOptionId="b"
  explanation={
    <>
      The modern <em>typed-variable</em> syntax is <code>{`\${name: type}`}</code>.
      Without the annotation, Robot Framework treats the value as a string.
    </>
  }
/>
```

## `<TrueFalse>` — boolean question

Mechanically a 2-option MCQ. The component exists separately so xAPI emits
`interactionType: "true-false"` rather than `"choice"` (the LMS / LRS can
distinguish).

| Prop | Type | Required | Default | Notes |
|---|---|---|---|---|
| `id` | `string` | yes | — | Unique within the parent `<Quiz>` |
| `prompt` | `ReactNode` | yes | — | The question |
| `correctAnswer` | `boolean` | yes | — | `true` if "True" is correct, `false` if "False" |
| `trueLabel` | `string` | no | `"True"` | Override the label (e.g., "Yes" / "No") |
| `falseLabel` | `string` | no | `"False"` | |
| `explanation` | `ReactNode` | no | — | Shown after grading |

### Example

```mdx
<TrueFalse
  id="control-end"
  prompt="`IF / ELSE`, `FOR`, and `TRY / EXCEPT` all require a closing `END`."
  correctAnswer={true}
  explanation="Every control-structure block in Robot Framework closes with `END` — no exceptions. Forgetting it is a common beginner mistake."
/>
```

## Grading model

When the learner clicks Submit:

1. The parent `<Quiz>` polls every registered child for its result via the
   `getResult()` method (component-internal API; the data flow is
   bottom-up so per-change updates don't re-render the parent).
2. Each result yields `{ id, correct, response, correctResponse }`.
3. `scaledScore = correctCount / totalQuestions`.
4. `passed = scaledScore >= passingScore`.
5. If a tracker is wired, the quiz emits in this order:
   - `tracker.recordInteraction(...)` for each question.
   - `tracker.setScore({ scaled, raw, min, max })`.
   - `tracker.complete()`.
   - `passed ? tracker.pass() : tracker.fail()`.
6. `onGraded(report)` fires (if provided).
7. The UI rerenders with the per-question feedback and the pass/fail
   summary.

After grading, all inputs are disabled. The quiz is one-shot; the learner
gets one attempt per page load. (Reload the page to retry.)

## Common patterns

### Reveal the next lesson on pass

```mdx
import { Quiz, MCQ } from '@lernkit/components';
import { useState } from 'react';

export const Gate = () => {
  const [passed, setPassed] = useState(false);
  return (
    <>
      <Quiz id="prereq" passingScore={1.0} onGraded={(r) => setPassed(r.passed)}>
        <MCQ id="check" prompt="…" options={[…]} correctOptionId="…" />
      </Quiz>
      {passed ? <a href="/next-lesson">Continue →</a> : null}
    </>
  );
};

<Gate client:visible />
```

### Mix MCQ and TrueFalse in one quiz

```mdx
<Quiz id="mixed" passingScore={0.7} client:visible>
  <MCQ id="q1" prompt="…" options={[…]} correctOptionId="…" />
  <TrueFalse id="q2" prompt="…" correctAnswer={true} />
  <MCQ id="q3" prompt="…" options={[…]} correctOptionId="…" />
</Quiz>
```

The questions render in document order. The score is computed across the
whole set.

### Don't grade — just give a knowledge check

If you skip the `<Quiz>` wrapper, `<MCQ>` and `<TrueFalse>` won't render
their inputs (they require a Quiz context). Use case for raw `<MCQ>`
without grading: build a custom container.

For a "no-grade" feel inside a Quiz, set `passingScore={0}` so the learner
always passes — but then *all* runs emit a `pass` event, which probably
isn't what you want. The cleanest "ungraded" pattern is to skip the
component and write the checklist as plain Markdown.

## What gets emitted to the LMS

Inside a SCORM 1.2 SCO with `LernkitScorm12Adapter` (via `pickTracker`),
each quiz submit produces:

| Tracker call | SCORM 1.2 effect |
|---|---|
| `recordInteraction(...)` × N | Buffered in-adapter (Phase 1+ writes to `cmi.interactions.N`) |
| `setScore({ scaled })` | `cmi.core.score.raw` = `scaled × 100`; `min` = 0; `max` = 100 |
| `complete()` | `cmi.core.lesson_status = 'completed'` |
| `pass()` | `cmi.core.lesson_status = 'passed'` |
| `fail()` | `cmi.core.lesson_status = 'failed'` |

In dev (no SCO), the `XapiStubAdapter` builds xAPI 2.0 statements in
memory; the docs course renders them in a `<details>` panel below each
quiz so you can eyeball the wire format.

## Where to go next

- **[Tracking interface](/tracking/interface)** — the full Tracker
  contract.
- **[`pickTracker`](/tracking/pick-tracker)** — runtime adapter
  selection.
- **[Components reference](/components/)** — every widget Lernkit ships.
