import { isTextEntry } from '../ui/utils/isTextEntry';
import { resolveShortcut } from '../ui/utils/keyActions';
import { setModifierHeld } from '../ui/utils/modifierHint';

/*
 * The ONE app-level key listener (kdd/keyboard-layer). Everything the keyboard
 * layer dispatches globally happens here, and nothing else in the app listens
 * for keys at the document or window level.
 *
 * WHY `window`, BUBBLE PHASE — this is load-bearing, and all three alternatives
 * are broken:
 *
 *  - CAPTURE at document runs BEFORE every element handler, so navigate-up
 *    would fire while a dialog is open. Fatal.
 *  - BUBBLE at document runs before Kobalte's own document listener, which is
 *    registered later (when a popup opens). Escape closing a <Select> would
 *    then ALSO navigate up, away from the screen.
 *  - Solid's JSX `onKeyDown` is delegated at document, so it cannot be used for
 *    this at all: it runs after the native event already reached document.
 *
 * `window` is the last target in the bubble path, so it runs after every
 * document listener regardless of registration order — after Solid's delegate
 * and after Kobalte's. Two consequences we depend on:
 *
 *   1. a surface that consumed the key with stopPropagation() (a modal
 *      <dialog>) means the event never arrives here at all, which IS the Escape
 *      ladder's containment (KB-X1..X3);
 *   2. a surface that consumed it with preventDefault() (Kobalte's picker, a
 *      slide-over, a table clearing row focus) is caught by the
 *      `defaultPrevented` bail below.
 *
 * Mounted by KeyboardHost inside ShellLayout, NOT in App: navigate-up and the
 * registry are meaningless on the login and boot screens.
 */

export const startKeyboardDispatcher = (): (() => void) => {
  const onKeyDown = (event: KeyboardEvent) => {
    // KB-H1: reveal the hint badges while Alt or Ctrl is held. Deliberately
    // BEFORE every bail — badges must appear even when the keystroke itself is
    // consumed by something else.
    if (event.altKey || event.ctrlKey) setModifierHeld(true);

    // A rung above us already claimed the key.
    if (event.defaultPrevented) return;
    // A held or repeating key must not re-run an action. Same reasoning as
    // AC-KB26 for Enter: one press, one action.
    if (event.repeat) return;
    // Mid-IME-composition keys belong to the composition, never to a command
    // (the Android GBoard trap StoreSelector already documents).
    if (event.isComposing) return;

    const action = resolveShortcut(event);
    const shortcut = action?.shortcut;
    if (!action || !shortcut) return;

    // KB-1, the tier gate — the ONLY thing a tier decides. `global` is
    // suppressed while a text field holds focus, so a shortcut letter typed
    // into a field is text and not a command. `surface` (a dialog's Alt+S) and
    // `always` (a bare '+') are deliberately exempt: a user who has just typed
    // a value must be able to save without first leaving the field.
    if (shortcut.tier === 'global' && isTextEntry(document.activeElement))
      return;

    // Claim the key from the browser, but ONLY once matched: Ctrl+S is Save,
    // Mod+K is Chrome's omnibox, Alt+letter hits Firefox accesskeys. An
    // unmatched key is never touched (kdd/keyboard-layer § one preventDefault
    // policy).
    event.preventDefault();
    action.run();
  };

  const onKeyUp = (event: KeyboardEvent) => {
    if (!event.altKey && !event.ctrlKey) setModifierHeld(false);
  };

  // Alt+Tab swallows the keyup, and pressing Alt alone on Windows moves focus
  // to the browser's menu bar — either way we will never see the release, so
  // losing the window or the tab clears the badges.
  const clearHint = () => setModifierHeld(false);

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', clearHint);
  document.addEventListener('visibilitychange', clearHint);

  return () => {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('blur', clearHint);
    document.removeEventListener('visibilitychange', clearHint);
  };
};
