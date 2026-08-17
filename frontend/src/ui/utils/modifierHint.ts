import { createSignal } from 'solid-js';

/*
 * Whether a hint-revealing modifier is held down (KB-H1, ui-surface S2): while
 * Alt or Ctrl is held, every control carrying a shortcut reveals it as a badge,
 * and releasing hides them again.
 *
 * ONE module-scope signal, set by the ONE app-level listener pair
 * (src/keyboard/keyboardDispatcher.ts) — house style for global state
 * (kdd/state-management), not a context: every control on every screen reads
 * it, and none of them needs a provider to do so. Controls read it under a
 * <Show>, so a screen with no shortcut-carrying controls renders nothing extra.
 *
 * The setter is exported for the dispatcher alone. Nothing else may write it —
 * a control that could set "a modifier is held" would be lying about the
 * keyboard.
 */

const [modifierHeld, setModifierHeld] = createSignal(false);

export { modifierHeld, setModifierHeld };
