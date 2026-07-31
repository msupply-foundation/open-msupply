import { t } from '../../intl';

/*
 * A key binding as a VALUE (kdd/keyboard-layer). The type is branded and the
 * constructor is private to this module, so the ONLY bindings that exist are
 * the ones spec/keyboard/behaviours.md names. The app never spells a binding
 * out; it names the const.
 *
 * One value serves all three consumers, which is what makes AC-KB15's "the
 * badge MUST be driven by the same declared shortcut the control exposes to
 * assistive technology — never a second, hand-maintained copy that can drift"
 * structural rather than a rule someone follows:
 *
 *   matches()           the dispatcher
 *   ariaKeyshortcuts()  the accessibility tree
 *   shortcutLabel()     the hint badge and the palette entry
 *
 * Three things a naive { alt, ctrl, shift, meta, key } record cannot express,
 * each of which is a real break rather than a nicety:
 *
 *  - LETTERS MATCH `code`, NOT `key`. On macOS Option+M delivers key === 'µ' and
 *    Option+N a dead key, while `code` stays 'KeyM' / 'KeyN'. (The same holds for
 *    digits on AZERTY, where Ctrl+1 arrives as '&' — no digit binding exists
 *    today, so that branch isn't carried.) Named keys and punctuation ('Escape',
 *    '+') match `key`, because a BARE character binding is layout-dependent by
 *    intent (KB-L2: a surface may claim '+' only where '+' isn't valid input).
 *  - `mod`, NOT `meta`. KB-P1 makes the palette Cmd+K on macOS and Ctrl+K
 *    elsewhere — the one binding that genuinely differs by platform, against
 *    KB-M1's "the binding itself does not change with the platform".
 *  - `tier` LIVES HERE (KB-1), with three values because KB-L2 needs a third.
 *    The tier decides exactly one thing: whether a focused text field swallows
 *    the key.
 */

declare const shortcutBrand: unique symbol;

/**
 * Whether a focused text field swallows the key (KB-1, KB-L2). The tier decides
 * ONLY that — not priority, not ordering. Priority is expressed by the two
 * ladders instead, where the innermost open surface consumes the key.
 */
export type ShortcutTier =
  /** Suppressed while a text field holds focus: the registry's shortcuts. */
  | 'global'
  /**
   * Fires anywhere within its surface, INCLUDING inside a text field — a
   * dialog's Alt+S and Escape (KB-1's dialog tier), the palette's key. A
   * user who has just typed a value must be able to save without leaving the
   * field.
   */
  | 'surface'
  /**
   * A bare character claimed by a surface (KB-L2). Fires wherever it is
   * pressed, text field or not, and is only safe where the character is not
   * itself valid input to that surface's fields.
   */
  | 'always';

export interface Shortcut {
  readonly alt: boolean;
  readonly ctrl: boolean;
  readonly shift: boolean;
  /** Platform-primary modifier: Meta on Apple, Control elsewhere. */
  readonly mod: boolean;
  /** `KeyboardEvent.code` — layout-independent, for letters and digits. */
  readonly code?: string;
  /** `KeyboardEvent.key` — for named keys and punctuation. */
  readonly key?: string;
  readonly tier: ShortcutTier;
  readonly [shortcutBrand]: true;
}

interface ShortcutInit {
  alt?: boolean;
  ctrl?: boolean;
  shift?: boolean;
  mod?: boolean;
  code?: string;
  key?: string;
  tier: ShortcutTier;
}

// Private constructor. Adding a const below without a matching row in
// spec/keyboard/behaviours.md is the drift this module exists to prevent.
const shortcut = (init: ShortcutInit): Shortcut =>
  ({
    alt: init.alt === true,
    ctrl: init.ctrl === true,
    shift: init.shift === true,
    mod: init.mod === true,
    ...(init.code !== undefined ? { code: init.code } : {}),
    ...(init.key !== undefined ? { key: init.key } : {}),
    tier: init.tier,
  }) as Shortcut;

/*
 * ─── The binding table ──────────────────────────────────────────────────────
 * spec/keyboard/behaviours.md § The global registry, in its order. Each const
 * names the ONE place that creates its action, so the click-through chain from
 * a binding to its behaviour starts here (kdd/keyboard-layer § the honest cost
 * is a lost reverse lookup). A const whose creation site does not exist yet
 * says so explicitly — the spec's binding table is the authority for what MAY
 * be here, and an unmarked const with no creator is the drift this file
 * prevents. In the running app, `__keyActions()` (dev only) answers the same
 * question from the other end: what is registered right now, in resolution
 * order.
 */

/** Go to Dashboard. Always available. — globalActions */
export const ALT_D = shortcut({ alt: true, code: 'KeyD', tier: 'global' });
/** Help. Always available. — globalActions */
export const ALT_H = shortcut({ alt: true, code: 'KeyH', tier: 'global' });
/** Sync — opens the sync window. Always available. — globalActions */
export const ALT_SHIFT_S = shortcut({
  alt: true,
  shift: true,
  code: 'KeyS',
  tier: 'global',
});
/** Logout — asks to confirm first. Always available. — globalActions */
export const ALT_SHIFT_L = shortcut({
  alt: true,
  shift: true,
  code: 'KeyL',
  tier: 'global',
});
/** Easter egg. Always available. — globalActions */
export const ALT_SHIFT_E = shortcut({
  alt: true,
  shift: true,
  code: 'KeyE',
  tier: 'global',
});
/** Show the more-info panel. — createSidePanelOpen */
export const ALT_M = shortcut({ alt: true, code: 'KeyM', tier: 'global' });
/** Hide the more-info panel. — createSidePanelOpen */
export const ALT_SHIFT_M = shortcut({
  alt: true,
  shift: true,
  code: 'KeyM',
  tier: 'global',
});
/** The screen's add / new action (KB-R2). — createAddAction */
export const ALT_N = shortcut({ alt: true, code: 'KeyN', tier: 'global' });
/**
 * Print prescription labels. Prescription detail only. — PrescriptionDetailView
 */
export const ALT_L = shortcut({ alt: true, code: 'KeyL', tier: 'global' });
/**
 * Update status. Prescription detail only — declared by the footer that owns
 * the status control and its selection. — PrescriptionStatusFooter
 */
export const ALT_V = shortcut({ alt: true, code: 'KeyV', tier: 'global' });
/**
 * Scan a barcode. NOT YET REGISTERED — its creation site is the scanner
 * control, which does not exist yet; it belongs in the helper that owns that
 * control, the way createSidePanelOpen owns Alt+M (KB-R2).
 */
export const CTRL_S = shortcut({ ctrl: true, code: 'KeyS', tier: 'global' });
/**
 * Navigate up one level (KB-X5) — the Escape ladder's tail. Registered as an
 * UNLISTED action (AC-KB11): it owns the binding without being browsable.
 */
export const ESCAPE = shortcut({ key: 'Escape', tier: 'global' });

/**
 * A dialog's Save (KB-1's dialog tier). `surface`, so it fires from inside a
 * text field — the whole point of the dialog tier. — Dialog
 */
export const ALT_S = shortcut({ alt: true, code: 'KeyS', tier: 'surface' });
/** Open the command palette (KB-P1): Cmd+K on macOS, Ctrl+K elsewhere. */
export const MOD_K = shortcut({ mod: true, code: 'KeyK', tier: 'surface' });

/*
 * No tab-switching bindings: nothing in this app has tabbed tables to switch
 * between, so `Ctrl+1`–`Ctrl+3` are unclaimed and go to the browser, where they
 * switch its own tabs. Consts kept here for bindings nothing can fire would be
 * exactly the drift this table exists to prevent.
 */

/**
 * Stocktake line editor: Add batch (KB-L1/L2). A bare character, so `always` —
 * '+' is not valid input to any of that surface's quantity, price or date
 * fields, which is exactly why it may be claimed bare.
 */
export const PLUS = shortcut({ key: '+', tier: 'always' });

/*
 * ─── Platform ───────────────────────────────────────────────────────────────
 * Read per call rather than memoised at import: a memo would freeze whatever
 * `navigator` looked like when this module first loaded, which is untestable,
 * and the read is gated on `mod` below so in practice it runs at most once per
 * keypress. Presentation only — KB-M1: only the SPELLING changes with the
 * platform, never the binding.
 */
const APPLE = /mac|iphone|ipad|ipod/i;

const isApplePlatform = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  // `platform` is deprecated but is still the only reliable signal across the
  // engines we support; userAgent is the fallback where it's absent.
  return APPLE.test(navigator.platform || navigator.userAgent);
};

/*
 * ─── Matching ───────────────────────────────────────────────────────────────
 */

/**
 * Does this event fire this binding? Pure — `repeat` and text-field
 * suppression are the dispatcher's business (see keyboardDispatcher), not the
 * binding's.
 */
export const matches = (s: Shortcut, event: KeyboardEvent): boolean => {
  if (event.altKey !== s.alt) return false;

  if (s.mod) {
    // The primary modifier must be held and the OTHER one must not, so Ctrl+K
    // on a Mac doesn't also open the palette.
    const apple = isApplePlatform();
    if (apple ? !event.metaKey || event.ctrlKey : !event.ctrlKey) return false;
    if (!apple && event.metaKey) return false;
  } else {
    if (event.ctrlKey !== s.ctrl) return false;
    // No binding in the table uses Meta on its own, so a held Meta means the
    // user is reaching for a browser or OS command, not ours.
    if (event.metaKey) return false;
  }

  if (s.code !== undefined) {
    if (event.shiftKey !== s.shift) return false;
    return event.code === s.code;
  }
  // Key-matched: the key VALUE already encodes the shift state (US '+' arrives
  // as Shift+Equal), so comparing shiftKey as well would make a bare-character
  // binding unpressable on most layouts.
  return event.key === s.key;
};

/*
 * ─── Rendering ──────────────────────────────────────────────────────────────
 * TWO renderings of one value. `aria-keyshortcuts` has a canonical grammar
 * (ARIA modifier names + DOM key names) that is NOT the human spelling, so a
 * single label function would emit invalid ARIA.
 */

// 'KeyD' → 'D'. A `key`-matched binding renders its key as-is ('Escape', '+').
// Every code-matched binding in the table is a letter; a digit binding would add
// a `Digit` branch here, and its test alongside.
const keyName = (s: Shortcut): string => {
  if (s.key !== undefined) return s.key;
  const code = s.code ?? '';
  return code.startsWith('Key') ? code.slice(3) : code;
};

/**
 * The `aria-keyshortcuts` value — 'Alt+Shift+M', 'Control+S', 'Escape'. ARIA
 * modifier names in the canonical order, never the platform spelling.
 */
export const ariaKeyshortcuts = (s: Shortcut): string => {
  const parts: string[] = [];
  if (s.mod) parts.push(isApplePlatform() ? 'Meta' : 'Control');
  if (s.ctrl) parts.push('Control');
  if (s.alt) parts.push('Alt');
  if (s.shift) parts.push('Shift');
  parts.push(keyName(s));
  return parts.join('+');
};

/**
 * The human spelling shown to the user, on a badge (S2) or in a palette entry
 * (KB-P4). KB-M1: Alt is "Option" on macOS and "Alt" elsewhere, and the
 * palette's key is "Command" on macOS and "Control" elsewhere.
 */
export const shortcutLabel = (s: Shortcut): string => {
  const apple = isApplePlatform();
  const parts: string[] = [];
  if (s.mod) parts.push(t(apple ? 'label.key-command' : 'label.key-control'));
  if (s.ctrl) parts.push(t('label.key-control'));
  if (s.alt) parts.push(t(apple ? 'label.key-option' : 'label.key-alt'));
  if (s.shift) parts.push(t('label.key-shift'));
  parts.push(keyName(s));
  return parts.join('+');
};
