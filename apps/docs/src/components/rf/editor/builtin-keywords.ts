import type { Completion } from '@codemirror/autocomplete';

/**
 * A curated subset of Robot Framework's `BuiltIn` library — the keywords a
 * learner working through Sections 1–2 of the Lernkit RF training will
 * actually type. Each entry includes the exact keyword name, a one-line
 * description, and a short usage hint.
 *
 * Phase-2 MVP scope: hardcoded list, ~30 keywords. The next slice replaces
 * this with libdoc JSONs fetched at build time (BuiltIn, Collections,
 * String, DateTime, OperatingSystem, XML) — same Completion shape so the
 * editor consumer doesn't change.
 *
 * Selected from https://robotframework.org/robotframework/latest/libraries/BuiltIn.html
 * (always-imported library) — chosen to maximise relevance to the training
 * material we ship today.
 */

interface RfKeywordEntry {
  readonly name: string;
  readonly summary: string;
  readonly usage?: string;
}

const ENTRIES: readonly RfKeywordEntry[] = [
  // Logging — chapter 2.2
  { name: 'Log', summary: 'Logs a message to the Robot Framework log.', usage: 'Log    Hello from RF' },
  {
    name: 'Log To Console',
    summary: 'Prints a message to the console immediately, in addition to the log file.',
    usage: 'Log To Console    Ready for dock assignments',
  },
  { name: 'Log Many', summary: 'Logs each argument as a separate entry.' },
  {
    name: 'Comment',
    summary: 'Does nothing with the arguments — useful as inline test commentary.',
  },

  // Assertions — chapter 2.4
  {
    name: 'Should Be Equal',
    summary: 'Fails if `first` is not equal to `second`. String comparison by default.',
    usage: 'Should Be Equal    ${origin}    Munich',
  },
  {
    name: 'Should Be Equal As Integers',
    summary: 'Type-aware equality comparing values as integers.',
    usage: 'Should Be Equal As Integers    ${total}    9200',
  },
  {
    name: 'Should Be Equal As Numbers',
    summary: 'Type-aware equality comparing values as numbers (handles floats).',
  },
  {
    name: 'Should Be Equal As Strings',
    summary: 'Forces both operands to strings before comparing.',
  },
  {
    name: 'Should Not Be Equal',
    summary: 'Inverse of `Should Be Equal` — fails when the values match.',
  },
  {
    name: 'Should Be True',
    summary: 'Fails if the given Python expression evaluates to a falsy value.',
    usage: 'Should Be True    ${weight} < 25000',
  },
  { name: 'Should Be False', summary: 'Fails if the given expression is truthy.' },
  {
    name: 'Should Contain',
    summary: 'Fails if `container` does not contain `item` (works on strings, lists, dicts).',
    usage: 'Should Contain    ${containers}    MRKU1234567',
  },
  {
    name: 'Should Not Contain',
    summary: 'Inverse of `Should Contain` — fails when the item is present.',
  },
  {
    name: 'Should Be Empty',
    summary: 'Fails if the given collection or string is non-empty.',
  },
  {
    name: 'Should Not Be Empty',
    summary: 'Fails if the given collection or string is empty.',
  },
  {
    name: 'Length Should Be',
    summary: 'Fails if the length of the given item is not as expected.',
    usage: 'Length Should Be    ${containers}    2',
  },
  {
    name: 'Should Match',
    summary: 'Fails if the string does not match the given glob/regex pattern.',
  },

  // Variables — chapter 2.3
  {
    name: 'Set Variable',
    summary: 'Returns the given value(s) so it can be assigned to a variable.',
    usage: '${count}=    Set Variable    42',
  },
  {
    name: 'Set Test Variable',
    summary: 'Sets a variable that is available for the rest of the current test only.',
  },
  {
    name: 'Set Suite Variable',
    summary: 'Sets a variable that is available for the rest of the current suite.',
  },
  {
    name: 'Set Global Variable',
    summary: 'Sets a variable that is available globally across all suites.',
  },
  {
    name: 'Get Variable Value',
    summary: 'Returns the value of the named variable, or a default if unset.',
  },

  // Evaluate / control
  {
    name: 'Evaluate',
    summary: 'Runs a Python expression and returns the result.',
    usage: '${total}=    Evaluate    ${weight} + 1000',
  },
  {
    name: 'Run Keyword',
    summary: 'Executes the given keyword by name with the given arguments.',
  },
  {
    name: 'Run Keyword If',
    summary: 'Runs the given keyword if the condition evaluates truthy. (Prefer IF/ELSE in modern RF.)',
  },
  {
    name: 'Run Keyword And Return',
    summary: 'Runs the given keyword and returns from the calling keyword with its result.',
  },
  {
    name: 'Run Keyword And Ignore Error',
    summary: 'Executes the keyword; returns status + output instead of failing on error.',
  },

  // Lifecycle
  { name: 'Sleep', summary: 'Pauses execution for the given duration (HH:MM:SS or seconds).' },
  { name: 'Pass Execution', summary: 'Marks the current test as passed and stops execution.' },
  { name: 'Fail', summary: 'Fails the current test with an optional message.' },
  { name: 'Skip', summary: 'Skips the current test with an optional reason.' },
  { name: 'Skip If', summary: 'Skips the current test if the given condition is truthy.' },
  {
    name: 'Set Tags',
    summary: 'Adds tags to the current test or keyword.',
  },
  { name: 'Remove Tags', summary: 'Removes the given tags from the current test or keyword.' },
];

export const builtinKeywordCompletions: readonly Completion[] = ENTRIES.map((kw) => ({
  label: kw.name,
  type: 'function',
  detail: 'BuiltIn',
  info: () => {
    const wrapper = document.createElement('div');
    wrapper.className = 'lernkit-rf-completion-doc';
    const summary = document.createElement('div');
    summary.textContent = kw.summary;
    wrapper.appendChild(summary);
    if (kw.usage) {
      const pre = document.createElement('pre');
      pre.textContent = kw.usage;
      wrapper.appendChild(pre);
    }
    return wrapper;
  },
}));
