# @lernkit/components

React components for Lernkit courses. Phase 1 ships the first quiz primitives: `<Quiz>`, `<MCQ>`, `<TrueFalse>`. They hydrate as Astro islands inside lessons and drive the unified Tracker (`@lernkit/tracker`) so quiz interactions flow through to SCORM / cmi5 / xAPI adapters.

## Usage

```tsx
import { Quiz, MCQ, TrueFalse } from '@lernkit/components';
import { NoopAdapter } from '@lernkit/tracker';

const tracker = new NoopAdapter();
await tracker.init();

<Quiz id="python-intro-check" title="Check: Python basics" passingScore={0.8} tracker={tracker}>
  <MCQ
    id="q1"
    prompt="Which keyword defines a function?"
    options={[
      { id: 'a', label: 'func' },
      { id: 'b', label: 'def' },
      { id: 'c', label: 'fn' },
    ]}
    correctOptionId="b"
    explanation="Python uses `def` for function definitions."
  />
  <TrueFalse id="q2" prompt="Python lists are ordered." correctAnswer={true} />
</Quiz>
```

On Submit: each question's result flows into the Quiz → Tracker:
- `recordInteraction` per question (id = `quiz-id:question-id`)
- `setScore` with the aggregate scaled score
- `complete` + `pass` if `scaledScore >= passingScore`, else `fail`

Inside a SCORM 1.2 package produced by `@lernkit/packagers`, the tracker is `LernkitScorm12Adapter`, which in turn drives `window.API`. Outside a SCORM container (preview / plain HTML), pass `NoopAdapter` (or omit `tracker` — the quiz still grades client-side).

## Design notes

- **Questions register bottom-up** via React context — each child widget calls `ctx.register({ id, getResult })` at mount. The container polls them at submit time. Avoids per-keypress re-renders.
- **Order-safe Tracker calls** — interactions, then score, then pass/fail. Matches SCORM 1.2's single-status-field landmine (research §3.2).
- **Accessibility**: `<fieldset disabled>` after grading, `role="radiogroup"`, `aria-labelledby` on questions, `role="status"` on feedback.

## Phase 1 limits

- Shipped: `<Quiz>`, `<MCQ>` (single-answer), `<TrueFalse>`.
- Not yet: `<MultiResponse>`, `<FillBlank>`, `<Matching>`, `<Sequence>`, `<DragDrop>`, `<Hotspot>`, `<ShortAnswer>`, `<Numeric>`, `<QuestionBank>`. These arrive in subsequent slices per the Phase 1 plan.
