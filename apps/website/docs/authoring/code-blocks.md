---
id: code-blocks
title: Code blocks and syntax highlighting
sidebar_position: 7
---

# Code blocks and syntax highlighting

For *showing* code without running it, use fenced Markdown code blocks.
Starlight integrates [Expressive Code](https://expressive-code.com/) for
syntax highlighting, frames, line markers, and copy-to-clipboard — no
extra configuration needed.

For code learners can edit and run, use
[`<RunnablePython>`](/authoring/runnable-python) or
[`<RunnableRobot>`](/authoring/runnable-robot) instead.

## Basic syntax

A fenced block:

`````mdx
```python
def greet(name):
    return f"Hello, {name}!"
````
`````

Renders as:

```python
def greet(name):
    return f"Hello, {name}!"
````

Supported languages cover everything authors typically need: `python`,
`javascript` / `js`, `typescript` / `ts`, `tsx`, `jsx`, `bash` / `sh`,
`json`, `yaml`, `xml`, `html`, `css`, `markdown` / `md`, `mdx`, `robot`,
`powershell`, `dockerfile`, `nginx`, `sql`, `rust`, `go`, `c`, `cpp`,
`java`. Full list: [Expressive Code's Shiki bundle](https://shiki.style/languages).

## Title

Add a `title=` after the language to render a filename in the frame:

`````mdx
```python title="hello.py"
print("Hello, world!")
````
`````

```python title="hello.py"
print("Hello, world!")
````

The frame chrome makes it clear the snippet is the contents of a file.

## Mark lines

The `{N}` and `{N-M}` ranges highlight specific lines:

`````mdx
```python title="example.py" {2,5-7}
def average(nums):
    total = 0          # ← marked
    for n in nums:
        total += n
    n = len(nums)       # ← marked
    if n == 0:          # ← marked
        return 0        # ← marked
    return total / n
````
`````

Renders with the marked lines highlighted.

### Insertion / deletion markers

For diffs:

````mdx
```diff lang="python"
def greet(name):
-    return "Hello, " + name + "!"
+    return f"Hello, {name}!"
````
`````

```diff lang="python"
def greet(name):
-    return "Hello, " + name + "!"
+    return f"Hello, {name}!"
````

The `lang="python"` after `diff` ensures the surrounding code keeps its
Python coloring; the `+` and `-` lines get the conventional green/red
highlight.

### "ins" / "del" / "mark" / "error" / "warning"

For richer per-line semantics without diff syntax:

`````mdx
```python ins={2} del={5} {7-8} 
def greet(name):
    print(f"Hello, {name}!")    # added
    if not name:
        raise ValueError("name required")
    print("legacy path")        # removed
    # focus area:
    return name.lower().strip()
    # ↑ marked
````
`````

| Marker | Meaning | Color |
|---|---|---|
| `{N}` | mark | Yellow |
| `ins={N}` | insertion | Green |
| `del={N}` | deletion | Red |
| `{"text" }` | search-and-mark | Yellow |
| `frame="none"` | drop the frame chrome | — |
| `frame="terminal"` | render as terminal | — |

## Frames: code vs terminal

Expressive Code auto-detects whether a block is a terminal command (and
shows it with a terminal-style frame) vs source code (file frame). Force
the choice:

````mdx
```bash frame="terminal"
$ pnpm install
$ pnpm dev
````
`````

````mdx
```bash frame="code" title=".bashrc"
export PATH="$HOME/.local/bin:$PATH"
````
`````

Heuristic: bash blocks where every line starts with `$` get the terminal
frame automatically.

## Inline code

Wrap inline code with single backticks:

```mdx
Use the `pip install` command to add a dependency.
````

Renders: Use the `pip install` command to add a dependency.

For inline code with a specific language (rare; mostly for syntax-aware
tooltips), Expressive Code doesn't auto-highlight inline. Stick to plain
backticks for inline.

## Hiding lines

Hide setup lines that aren't part of the lesson focus, but are needed
to make the example complete:

`````mdx
```python
# collapse-start
import sys
sys.path.insert(0, '../lib')
# collapse-end

# This is the line the lesson is about
print(answer)
````
`````

The hidden lines are collapsed by default with a "+ N more" toggle. (Note:
this requires the `expressive-code-plugin-collapsible-sections` plugin,
which Starlight 0.30+ ships out of the box.)

## Robot Framework code blocks

```robot title="hello.robot"
*** Settings ***
Documentation    Minimal example

*** Test Cases ***
Say Hello
    Log    Hello, Robot Framework!
    Should Be Equal    ${1 + 1}    ${2}
````

Robot Framework grammar is supported. The `${variable}` syntax highlights
correctly without escaping (this is plain Markdown, not MDX-evaluated
code — see [MDX](/authoring/mdx) for the difference).

## Multi-language tabs

For "do this on macOS / Linux / Windows" content, pair `<Tabs>` with
fenced blocks:

`````mdx
import { Tabs, TabItem } from '@astrojs/starlight/components';

<Tabs syncKey="os">
  <TabItem label="macOS / Linux">
    ```bash
    source .venv/bin/activate
    ```
  </TabItem>

  <TabItem label="Windows (PowerShell)">
    ```powershell
    .venv\Scripts\Activate.ps1
    ```
  </TabItem>

  <TabItem label="Windows (cmd.exe)">
    ```bat
    .venv\Scripts\activate.bat
    ```
  </TabItem>
</Tabs>
`````

The `syncKey="os"` makes all `<Tabs>` on the page with the same key
remember the learner's choice across them. So picking *macOS / Linux* in
one tab group shows *macOS / Linux* in every other group on the page.

See [Tables, callouts, images](/authoring/tables-callouts-images) for the
full `<Tabs>` reference.

## When to use code blocks vs runnable cells

Decision tree:

- **Show only** (the learner is reading, not running): fenced code block.
- **Run-and-edit (Python)**: [`<RunnablePython>`](/authoring/runnable-python).
- **Run-and-edit (RF)**: [`<RunnableRobot>`](/authoring/runnable-robot).
- **Two side-by-side examples (e.g., the same task in pip vs uv)**: a
  Markdown table or two `<Tabs>`. Don't try to make the runnable cells
  side-by-side; they're heavy and competing for attention.

## Authoring tips

- **Title every file-shaped block.** A learner copying code without
  knowing where it goes is lost.
- **Mark the line you're talking about.** `{3}` to highlight line 3 makes
  the prose line up with the code line.
- **Don't overuse `frame="none"`.** The frame is what makes the block feel
  like a unit.
- **Wrap shell prompts.** `$ ` for user shell, `# ` for root, `> ` for
  Windows. Expressive Code colors them distinctly.
- **Avoid copy-paste-bait.** Code that has placeholders like `<your-key>`
  with `<>` characters looks like JSX inside MDX even if it's inside a
  code block — they're safe inside fences, but the *prose* around them
  needs care. Use literal `&lt;your-key&gt;` outside fences.

## What about Mermaid / diagrams?

Mermaid diagrams aren't enabled by default in this Starlight config. Add
the [Starlight Mermaid integration](https://github.com/HiDeoo/starlight-mermaid)
if you need them; for now, ASCII diagrams in fenced blocks work everywhere:

````mdx
```
┌─────────┐    ┌─────────┐
│  Author │ →  │  build  │
└─────────┘    └─────────┘
                    ↓
               .scorm12.zip
```
````

## Where to go next

- **[Tables, callouts, images](/authoring/tables-callouts-images)** —
  non-code visual primitives.
- **[Runnable Python cells](/authoring/runnable-python)** — when learners
  need to run Python.
- **[Runnable Robot Framework cells](/authoring/runnable-robot)** — when
  learners need to run RF.
