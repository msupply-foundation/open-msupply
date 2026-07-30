/*
 * "Is focus somewhere a keystroke means TEXT, not a command?"
 *
 * ONE predicate, four consumers, because they are four readings of the same
 * question and four inline copies is how the tiers drift (kdd/keyboard-layer):
 *
 *  - KB-1     the global tier is suppressed while a text field holds focus, so
 *             a shortcut letter typed into a field is text, not a command.
 *  - KB-X5    navigate-up is suppressed for the same reason.
 *  - KB-N2    arrow keys inside a table's input/select/textarea belong to the
 *             field, not to row navigation.
 *  - KB-E2    Enter-to-confirm fires only FROM a form field (used as the core
 *             of the whitelist, never as a blacklist).
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
