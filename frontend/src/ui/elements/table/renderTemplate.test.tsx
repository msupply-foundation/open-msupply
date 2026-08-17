import { describe, expect, it } from 'vitest';
import { createMemo, createRoot, createSignal } from 'solid-js';
import { renderTemplate } from './renderTemplate';

/*
 * The table's column templates (`header` / `cell` / `footer`) must stay
 * REACTIVE: every header label is `() => t(...)` and every value preset reads
 * the locale signal (formatNumber / localisedDate / the currency cell). The
 * `createMemo` here stands in for the JSX insert that owns a cell in the real
 * table — both are tracking scopes that re-run when a signal the template read
 * changes.
 *
 * This is the guard on the bug renderTemplate exists to fix: rendering a
 * template through TanStack's `flexRender` runs it inside Solid's
 * `createComponent`, which untracks it, so a table painted in one language
 * stayed in that language — headers, numbers, dates and money all frozen —
 * until the page was reloaded. (That failure isn't asserted here: vitest
 * resolves a second Solid instance for `@tanstack/solid-table`, so its
 * `untrack` doesn't touch this instance's listener and flexRender appears to
 * track in-process. The real behaviour was confirmed in the browser.)
 */
describe('renderTemplate', () => {
  it('re-resolves a template when a signal it reads changes', () => {
    createRoot(dispose => {
      const [locale, setLocale] = createSignal('en');
      const cell = () => `${locale()}:398`;

      const rendered = createMemo(() => renderTemplate(cell, {}));

      expect(rendered()).toBe('en:398');
      setLocale('ar');
      expect(rendered()).toBe('ar:398');
      dispose();
    });
  });

  it('passes a plain string template through', () => {
    expect(renderTemplate('Batch', {})).toBe('Batch');
  });

  it('renders nothing for an absent template', () => {
    expect(renderTemplate(undefined, {})).toBeUndefined();
  });
});
