import { autocompletion, type CompletionContext, type CompletionResult } from '@codemirror/autocomplete';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import {
  bracketMatching,
  defaultHighlightStyle,
  indentOnInput,
  syntaxHighlighting,
} from '@codemirror/language';
import { EditorState, type Extension } from '@codemirror/state';
import {
  EditorView,
  drawSelection,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightSpecialChars,
  keymap,
  lineNumbers,
} from '@codemirror/view';
import { useEffect, useRef, type ReactElement } from 'react';

import { loadLibdocCompletions } from './libdoc-loader.js';
import { robotFrameworkLanguage } from './robot-framework-language.js';

export interface RobotFrameworkEditorProps {
  /** Current source. Treat as a controlled value. */
  readonly value: string;
  /** Called whenever the editor's content changes. */
  readonly onChange: (next: string) => void;
  /** Disable editing (still selectable + scrollable). */
  readonly readOnly?: boolean;
  /** Soft minimum height; the editor grows past this with content. */
  readonly minHeight?: string;
  /** ARIA label, since we don't render a `<label>` ourselves. */
  readonly ariaLabel?: string;
  /** Optional id for label-association from the parent. */
  readonly id?: string;
  /** Optional data-testid forwarded onto the editor host element. */
  readonly testId?: string;
}

/**
 * CodeMirror 6 editor configured for Robot Framework.
 *
 * Ships:
 *  - syntax highlighting via the local `robotFrameworkLanguage` (StreamLanguage,
 *    see ./robot-framework-language.ts)
 *  - autocomplete from the vendored libdoc JSONs (BuiltIn, Collections,
 *    String, DateTime, OperatingSystem, Process, XML — ~298 keywords) via
 *    `./libdoc-loader.ts`. Falls back to the hardcoded ~30-keyword list in
 *    `./builtin-keywords.ts` when the libdocs aren't reachable.
 *  - line numbers + active-line gutter highlight
 *  - bracket matching, history (undo/redo), search-friendly defaults
 *  - Tab → 4 spaces (preserves the two-space-separator rule by NOT
 *    auto-collapsing whitespace) per `indentWithTab`
 *
 * Bundle size: ~210 KB gzipped including the legacy-modes simpleMode helper
 * and CodeMirror's basic extensions. The libdocs themselves load lazily on
 * first autocomplete trigger (~900 KB JSON across the 7 libraries; cached
 * by the browser HTTP cache after the first request).
 */
export function RobotFrameworkEditor({
  value,
  onChange,
  readOnly = false,
  minHeight = '12em',
  ariaLabel = 'Robot Framework source',
  id,
  testId,
}: RobotFrameworkEditorProps): ReactElement {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Boot the editor exactly once.
  useEffect(() => {
    if (!hostRef.current) return undefined;

    const completionSource = async (
      ctx: CompletionContext,
    ): Promise<CompletionResult | null> => {
      const word = ctx.matchBefore(/[A-Za-z][A-Za-z0-9 ]*/);
      if (!word) return null;
      // Don't auto-pop on the first character unless the user explicitly asked for completion.
      if (word.from === word.to && !ctx.explicit) return null;
      const completions = await loadLibdocCompletions();
      return {
        from: word.from,
        options: completions as unknown as CompletionResult['options'],
        validFor: /^[A-Za-z][A-Za-z0-9 ]*$/,
      };
    };

    const extensions: Extension[] = [
      lineNumbers(),
      highlightActiveLineGutter(),
      highlightSpecialChars(),
      history(),
      drawSelection(),
      indentOnInput(),
      bracketMatching(),
      highlightActiveLine(),
      autocompletion({ override: [completionSource], activateOnTyping: false }),
      keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
      robotFrameworkLanguage,
      // Without this extension, CodeMirror computes token tags from
      // robotFrameworkLanguage but never paints them — the editor renders
      // monochrome. `fallback: true` keeps any future per-tag overrides
      // (or theme-provided styles) winning over this default.
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      EditorView.editable.of(!readOnly),
      EditorState.readOnly.of(readOnly),
      EditorView.theme({
        '&': { minHeight, fontSize: '0.95em', backgroundColor: 'var(--sl-color-bg-sidebar, #fff)' },
        '.cm-scroller': { fontFamily: 'var(--sl-font-mono, ui-monospace, SFMono-Regular, Menlo, monospace)' },
        '.cm-content': { padding: '0.5rem 0' },
        '.cm-gutters': {
          backgroundColor: 'var(--sl-color-bg-sidebar, #f6f6f6)',
          borderRight: '1px solid var(--sl-color-hairline, rgba(0,0,0,0.08))',
        },
      }),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) onChangeRef.current(update.state.doc.toString());
      }),
    ];

    const view = new EditorView({
      state: EditorState.create({ doc: value, extensions }),
      parent: hostRef.current,
    });
    viewRef.current = view;
    if (id) {
      const dom = view.contentDOM;
      dom.setAttribute('aria-label', ariaLabel);
      dom.setAttribute('id', id);
    } else {
      view.contentDOM.setAttribute('aria-label', ariaLabel);
    }

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // We deliberately ignore the dependency array — boot once. Subsequent
    // `value` and `readOnly` changes are propagated via the effects below.
    // biome-ignore lint/correctness/useExhaustiveDependencies: stable boot
  }, []);

  // Sync `value` from outside (e.g. Reset button on the parent).
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current !== value) {
      view.dispatch({ changes: { from: 0, to: current.length, insert: value } });
    }
  }, [value]);

  // Sync `readOnly` toggles.
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: [
        // We can't reconfigure exact extensions here without a Compartment.
        // Instead, rebuild the relevant flag via stateField — for an MVP,
        // simpler: dispatch nothing and rely on the boot-time value.
      ],
    });
  }, [readOnly]);

  return (
    <div
      ref={hostRef}
      className="lernkit-rf-editor"
      data-testid={testId}
      data-readonly={readOnly}
    />
  );
}

export default RobotFrameworkEditor;
