# CodeMirror 6 + Robot Framework: Grammar Lookup

Date: 2026-04-20. Time-boxed 10-minute lookup. Goal: pick a CM6 highlighting
strategy for a Lernkit `.robot` editor.

## 1. `lezer-robot` status

**Does not exist on npm.** `npm view lezer-robot` returns HTTP 404
(`https://registry.npmjs.org/lezer-robot` — Not Found, 2026-04-20). No
weekly-download stat to report; no grammar, no parser, no peer-deps. The
keyword "lezer-robot" appears nowhere in the GitHub web search results either.

```
$ npm view lezer-robot
npm error code E404
npm error 404 Not Found - GET https://registry.npmjs.org/lezer-robot
npm error 404  The requested resource 'lezer-robot@*' could not be found
```

Same 404 for the obvious sibling names:

- `codemirror-lang-robotframework` — 404
- `@codemirror/lang-robotframework` — 404
- `codemirror-robotframework` — 404
- `codemirror-mode-robotframework` — 404
- `cm6-robot`, `cm-lang-robot`, `robotframework-mode` — all 404

## 2. Other CM6-RF packages found

- **`@marketsquare/jupyterlab_robotmode`** (npm, BSD-3, 20.8 kB unpacked,
  v0.1.0 published "over a year ago"). Source confirms it is a **CodeMirror 5
  `defineSimpleMode`** definition — the export is a CM5 mode object, not a
  `StreamParser` and not a Lezer grammar. Not directly usable in CM6, but the
  regex set is a useful reference if we end up writing our own.
  Repo: <https://github.com/MarketSquare/jupyterlab_robotmode>.
- **No CM6 fork of the above**; no other GitHub repo turns up under
  `codemirror robot framework` searches with substantive maintenance.
- **`@codemirror/legacy-modes` 6.5.2** (2.0 MB unpacked) ships ~80 modes but
  the package contents listing for `mode/r*` shows only `r`, `rpm`, `ruby`,
  `rust` — **no `robot` mode**. README does not mention RobotFramework. So no
  drop-in `StreamLanguage` export exists.
- **RobotCode** (<https://github.com/robotcodedev/robotcode>) is a VS Code +
  LSP toolkit (TextMate-based highlighting). Not a CodeMirror artifact, but
  its TextMate scopes are the reference token list (see §3).

## 3. Token categories worth highlighting

Distilled from RobotCode's TextMate scopes plus the JupyterLab CM5 mode.
Lernkit MVP only needs the first six; the rest are nice-to-have.

| # | Category                  | Examples                                              |
|---|---------------------------|-------------------------------------------------------|
| 1 | Section header            | `*** Settings ***`, `*** Test Cases ***`, `*** Keywords ***`, `*** Variables ***` |
| 2 | Comment                   | `# ...` to end of line                                |
| 3 | Variable                  | `${var}`, `@{list}`, `&{dict}`, `%{env}`              |
| 4 | Setting / bracket setting | `Library`, `Resource`, `[Arguments]`, `[Documentation]`, `[Tags]`, `[Return]` |
| 5 | Control keyword           | `IF`, `ELSE`, `ELSE IF`, `END`, `FOR`, `IN`, `IN RANGE`, `WHILE`, `BREAK`, `CONTINUE`, `TRY`, `EXCEPT`, `FINALLY`, `RETURN` |
| 6 | Test/keyword name (def)   | First non-indented token after `*** Test Cases ***` / `*** Keywords ***` |
| 7 | Keyword call              | Indented token after the two-space separator         |
| 8 | String / embedded arg     | Quoted strings, `${arg}` inside keyword names         |
| 9 | Number / boolean          | Numeric literals, `True`/`False`/`None`               |
|10 | Separator (visual)        | The two-space (or `\t`) cell separator                |

## 4. Recommendation: write a `StreamLanguage` (regex-based)

Adopting `lezer-robot` is **blocked** — package does not exist. Adopting
`@marketsquare/jupyterlab_robotmode` is blocked — it's CM5-only and stale.
Deferring is unnecessary because the `StreamLanguage` path is well-trodden.

**Plan:** define a `StreamParser<State>` and wrap it with `StreamLanguage`.

```ts
// src/editor/robotLanguage.ts (≈80–120 LOC)
import { StreamLanguage, LanguageSupport } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";

const SECTION = /^\*{3}\s*(Settings|Variables|Test Cases|Tasks|Keywords|Comments)\s*\*{3}/i;
const VARIABLE = /[$@&%]\{[^}]*\}/;
const COMMENT = /#.*/;
const CONTROL = /\b(IF|ELSE IF|ELSE|END|FOR|IN(?: RANGE| ENUMERATE| ZIP)?|WHILE|BREAK|CONTINUE|TRY|EXCEPT|FINALLY|RETURN)\b/;
const BRACKET_SETTING = /\[(Arguments|Documentation|Tags|Setup|Teardown|Template|Timeout|Return)\]/;

const robotParser = {
  startState: () => ({ section: "settings", atLineStart: true }),
  token(stream, state) { /* match SECTION → header, COMMENT → lineComment,
                            VARIABLE → variableName, CONTROL → controlKeyword,
                            BRACKET_SETTING → propertyName, etc. */ },
  languageData: { commentTokens: { line: "#" } },
};

export const robotframework = () =>
  new LanguageSupport(StreamLanguage.define(robotParser));
```

API anchor (verified 2026-04-20):

```ts
import { StreamLanguage } from "@codemirror/language"; // v6.12.3
// Pattern from @codemirror/legacy-modes README:
//   StreamLanguage.define(lua)
```

Highlight tags map cleanly to the §3 list: `t.heading` (sections),
`t.lineComment`, `t.variableName`, `t.propertyName` (bracket settings),
`t.controlKeyword`, `t.definition(t.function(t.variableName))` (test/keyword
name), `t.function(t.variableName)` (call), `t.string`, `t.number`.

**Bundle impact:** zero new deps — `@codemirror/language` is already required
by any CM6 setup. Our own file ≤4 kB minified. Compare to importing all of
`@codemirror/legacy-modes` (2.0 MB unpacked) which we explicitly do **not**
need, since it does not contain a robot mode anyway.

**Out of scope for this slice:** autocomplete, LSP/RobotCode integration,
proper indentation rules, embedded-arg highlighting inside keyword names.
Revisit once the StreamLanguage prototype lands and we know how much of the
RobotCode scope set we actually want.
