import type { ColumnDefTemplate } from '@tanstack/solid-table';
import type { JSX } from 'solid-js';

/**
 * Render a column template (`header` / `cell` / `footer`) — our replacement for
 * TanStack's `flexRender`, used everywhere the table paints one.
 *
 * `flexRender` renders a function template through Solid's `createComponent`,
 * which runs it inside `untrack()`. That is right for a real component (its
 * own body owns its reactivity) but WRONG for our templates, which are plain
 * functions returning text derived from signals: `header: () =>
 * t('label.name')` reads the locale signal, and every value preset in
 * tableHelpers reads it too (formatNumber / localisedDate / the currency
 * cell). Untracked, those reads register no dependency, so a table painted in
 * English stayed in English — headers, numbers, dates and money all frozen —
 * until the page was reloaded.
 *
 * Calling the template directly keeps it in the caller's tracking scope, so the
 * JSX insert that owns the cell re-runs on a locale change and the text
 * re-resolves in place. The signals a template reads are exactly the ones it
 * should depend on (the locale, the row value); nothing else is added.
 */
export const renderTemplate = <P extends object>(
  template: ColumnDefTemplate<P> | undefined,
  props: P
): JSX.Element => (typeof template === 'function' ? template(props) : template);
