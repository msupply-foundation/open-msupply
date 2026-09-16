/*
 * "Is focus somewhere a keystroke means TEXT, not a command?"
 *
 * ONE predicate, three consumers, because they are three readings of the same
 * question and three inline copies is how the tiers drift (kdd/keyboard-layer):
 *
 *  - KB-1     the global tier is suppressed while a text field holds focus, so
 *             a shortcut letter typed into a field is text, not a command.
 *  - KB-X5    navigate-up is suppressed for the same reason.
 *  - KB-E2    Enter-to-confirm fires only FROM a form field (used as the core
 *             of the whitelist, never as a blacklist).
 *
 * A fourth reading — KB-N2, "arrow keys inside a table's input/select/textarea
 * belong to the field, not to row navigation" — is NOT a consumer, though it
 * names the same elements. List-table row navigation answers it structurally
 * instead: the rung acts only on a key that landed on the table or on a row, so
 * a key pressed on anything a cell contains is not its to take — which also
 * covers a button, and a button is not text entry (see table/createRowFocus).
 * `SELECT` is still covered below, because KB-N2 is the rule that names it.
 *
 * `type` matters: a checkbox, radio, button or file input is an <input> that
 * swallows nothing, so Alt+N pressed on a checked box must still fire.
 *
 * Read via `tagName` and `getAttribute`, NOT `instanceof HTMLInputElement`.
 * `instanceof` is false for an element belonging to another realm — a portaled
 * subtree in a different document, or anything an embedded frame owns — which
 * would silently classify a real text field as "not text entry" and let a
 * shortcut steal the keystroke. It also keeps the predicate testable in the
 * node environment the suite runs in (vitest.config.ts).
 */

// Input types that swallow NOTHING — these are the exceptions. Anything else,
// including an absent or unrecognised type, is treated as text, matching the
// browser's own fallback to `type=text`.
const NON_TEXT_INPUT_TYPES = new Set([
  'checkbox',
  'radio',
  'button',
  'submit',
  'reset',
  'file',
  'range',
  'color',
  'image',
  'hidden',
]);

export const isTextEntry = (el: Element | null | undefined): boolean => {
  if (!el) return false;

  switch (el.tagName) {
    case 'INPUT':
      return !NON_TEXT_INPUT_TYPES.has(
        (el.getAttribute('type') ?? 'text').toLowerCase()
      );
    // KB-N2 names select alongside input and textarea.
    case 'TEXTAREA':
    case 'SELECT':
      return true;
  }

  // Rich-text hosts. `isContentEditable` covers editability inherited from an
  // ancestor, which an attribute check on this element alone would miss.
  if ((el as HTMLElement).isContentEditable === true) return true;

  // A Kobalte Combobox's focusable is usually an <input type=text> and matches
  // above; this catches a trigger-based one, where typing still filters.
  return el.getAttribute('role') === 'combobox';
};
