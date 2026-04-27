import { StreamLanguage } from '@codemirror/language';
import { simpleMode } from '@codemirror/legacy-modes/mode/simple-mode';

/**
 * Robot Framework language definition for CodeMirror 6.
 *
 * Uses `@codemirror/legacy-modes`'s `simpleMode` helper — a regex-based
 * tokenizer that's pragmatic and small (~80 LOC) rather than a full Lezer
 * grammar. Covers the high-frequency cases:
 *
 *  - Section headers (`*** Settings ***`, etc.) on a line of their own
 *  - Comments (`#` to end of line)
 *  - Variables (`${name}`, `@{list}`, `&{dict}`) — incl. typed (`${x: int}`)
 *  - Test/keyword settings in square brackets (`[Documentation]`, `[Tags]`, …)
 *  - Control-flow keywords (`IF`, `ELSE`, `END`, `FOR`, `IN`, `IN RANGE`,
 *    `WHILE`, `BREAK`, `CONTINUE`, `TRY`, `EXCEPT`, `FINALLY`, `RETURN`)
 *  - Setting names that appear as the first token on a line under
 *    `*** Settings ***` (`Library`, `Resource`, `Suite Setup`, …)
 *  - Continuation marker `...`
 *  - The two-space separator is preserved by the renderer (whitespace
 *    is significant for execution — we don't try to highlight it).
 *
 * Trade-off: a regex-based tokenizer can't tell a "user keyword call" from a
 * "library keyword call" purely from the source — that requires a lexer with
 * scope tracking, which is what a real Lezer grammar provides. We accept
 * this for the MVP. The autocomplete provider compensates by surfacing
 * BuiltIn keywords from a static list.
 *
 * If `lezer-robot` (or a successor) becomes the right choice in a future
 * slice, swap `StreamLanguage.define(simpleMode(...))` for `LRLanguage.define`
 * in this single file. Downstream code consumes a `Language` instance — no
 * other file changes.
 */

const RF_CONTROL_KEYWORDS = [
  'IF',
  'ELSE',
  'ELSE IF',
  'END',
  'FOR',
  'IN',
  'IN RANGE',
  'IN ENUMERATE',
  'IN ZIP',
  'WHILE',
  'BREAK',
  'CONTINUE',
  'TRY',
  'EXCEPT',
  'FINALLY',
  'RETURN',
  'VAR',
];

const RF_SETTING_NAMES = [
  // Suite-level settings (under *** Settings ***)
  'Library',
  'Resource',
  'Variables',
  'Documentation',
  'Metadata',
  'Suite Setup',
  'Suite Teardown',
  'Test Setup',
  'Test Teardown',
  'Test Template',
  'Test Timeout',
  'Test Tags',
  'Force Tags',
  'Default Tags',
  'Keyword Tags',
  'Name',
];

const RF_TEST_OR_KW_SETTINGS = [
  // Inside [Brackets] on a test or keyword body
  'Documentation',
  'Tags',
  'Setup',
  'Teardown',
  'Template',
  'Timeout',
  'Arguments',
  'Return',
];

function alternation(words: readonly string[]): string {
  // Sort longest first so 'ELSE IF' matches before 'ELSE'.
  const sorted = [...words].sort((a, b) => b.length - a.length);
  return sorted.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s+')).join('|');
}

const controlPattern = new RegExp(`(?:${alternation(RF_CONTROL_KEYWORDS)})\\b`);
const settingPattern = new RegExp(`^(?:${alternation(RF_SETTING_NAMES)})(?=\\s{2,}|$)`, 'i');
const bracketSettingPattern = new RegExp(`\\[(?:${alternation(RF_TEST_OR_KW_SETTINGS)})\\]`, 'i');

const robotFrameworkSimpleMode = simpleMode({
  start: [
    // Section headers: `*** Settings ***`, `*** Test Cases ***`, etc.
    {
      regex: /^\s*\*{3,}\s*(?:Settings?|Variables?|Test\s*Cases?|Tasks?|Keywords?|Comments?)\s*\*{3,}\s*$/,
      token: 'header',
      sol: true,
    },

    // Whole-line comments
    { regex: /^\s*#.*$/, token: 'comment', sol: true },

    // Inline comments (anything from `  #` onward — needs at least one space before)
    { regex: /\s+#.*$/, token: 'comment' },

    // Continuation marker `...` at the start of a continuation line
    { regex: /^\s*\.{3}/, token: 'meta', sol: true },

    // Test/keyword bracket settings: [Documentation], [Tags], [Arguments], …
    { regex: bracketSettingPattern, token: 'attribute' },

    // Suite-setting names (only at start of line under *** Settings ***).
    // simpleMode can't condition on section context, so we just match the
    // common setting names anywhere they appear at start of line.
    { regex: settingPattern, token: 'def', sol: true },

    // Variables: ${scalar}, @{list}, &{dict}, including typed ${x: int}
    { regex: /[\$@&]\{[^}]*\}/, token: 'variable' },

    // Argument-style positional indicator: `${return}=` (assignment)
    { regex: /\b\w+=(?=\S)/, token: 'operator' },

    // Control-flow + structural keywords (IF, FOR, END, …) — case-sensitive.
    { regex: controlPattern, token: 'keyword' },

    // Numbers (used in IN RANGE bounds, comparisons, etc.)
    { regex: /\b\d+(?:\.\d+)?\b/, token: 'number' },

    // Quoted strings (rare in pure RF but surface them when present)
    { regex: /"[^"]*"/, token: 'string' },
    { regex: /'[^']*'/, token: 'string' },

    // Catch-all: any non-whitespace stays unstyled.
    { regex: /\S+/, token: null },
  ],
  // simpleMode's typed config doesn't expose languageData; we attach
  // `commentTokens` at the StreamLanguage level via `languageData` below
  // so Cmd-/ comment toggling routes through the right delimiter.
});

export const robotFrameworkLanguage = StreamLanguage.define({
  ...robotFrameworkSimpleMode,
  languageData: {
    commentTokens: { line: '#' },
    indentOnInput: /^\s*(?:END|ELSE(?:\s+IF)?|EXCEPT|FINALLY)\b/,
  },
});
