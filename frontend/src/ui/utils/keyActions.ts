import { getOwner, onCleanup } from 'solid-js';
import type { LocaleKey } from '../../intl';
import { ALT_N, matches, type Shortcut } from './shortcuts';

/*
 * The action registry (spec/keyboard KB-R1, kdd/keyboard-layer).
 *
 * KB-R1: "The registry is one list of named actions, each runnable from the
 * command palette by name. An action MAY additionally carry a shortcut... An
 * action MUST be registered only while it is actually available."
 *
 * That last sentence is why this is a registry and not a global switch: the set
 * is the UNION OVER THE MOUNTED TREE and is not statically knowable, and the
 * palette RENDERS it (KB-P3). `createAction` registers on creation and
 * unregisters on its owner's cleanup, so lifetime IS availability — a <Show>
 * that hides an add control stops answering Alt+N with no further code.
 *
 * Why this is not the registry kdd/explicit-composition forbids: an event bus
 * is untraceable because one producer fans out to N anonymous consumers. Here
 * there are MANY DECLARERS AND EXACTLY TWO CONSUMERS, both concrete and named —
 * the palette renders the list, the dispatcher matches one entry. Nothing
 * subscribes and nothing is notified. `run` is a closure written at the site
 * that owns the thing it acts on.
 *
 * NO REACTIVITY, deliberately. Nothing reads this reactively: the dispatcher
 * reads at keypress time, and the palette reads ONCE PER OPEN — while it is
 * open and modal, nothing behind it can mount or unmount. A signal would buy
 * <For> identity churn and a re-sort on every locale read, for no consumer.
 */

export interface KeyAction {
  /**
   * The palette entry's name, as a locale key so it re-translates on a language
   * switch. Absent for an unlisted action (AC-KB11) — one that exists to own a
   * shortcut, not to be found by browsing.
   */
  readonly name?: LocaleKey;
  /** Extra terms the palette filters on besides the name (KB-P3). */
  readonly keywords?: readonly LocaleKey[];
  readonly shortcut?: Shortcut;
  readonly run: () => void;
  /**
   * Inert AND unlisted while true. One field, because the spec has no
   * listed-but-inert action — and a disabled dialog Save must still be visible
   * with its badge, which is the button's business, not the registry's.
   */
  readonly disabled?: () => boolean;
  /**
   * Unregister. An OWNED action cleans itself up; this is for the ownerless
   * case (a bare call in a test), matching createFocusTarget's contract.
   */
  readonly dispose: () => void;
}

/**
 * A listed action: browsable in the palette by name, optionally carrying a
 * shortcut.
 */
interface ListedSpec {
  name: LocaleKey;
  keywords?: readonly LocaleKey[];
  unlisted?: never;
}

/**
 * An unlisted action: owns a shortcut and appears nowhere in the palette
 * (AC-KB11 — navigate-up). Declared explicitly rather than inferred from a
 * missing `name`, so a forgotten name can't silently vanish from the palette.
 */
interface UnlistedSpec {
  unlisted: true;
  name?: never;
  keywords?: never;
  shortcut: Shortcut;
}

export type KeyActionSpec = (ListedSpec | UnlistedSpec) & {
  shortcut?: Shortcut;
  run: () => void;
  /**
   * MUST be an accessor. Typed as a function so `disabled: isDisabled()`
   * cannot compile and silently freeze at its creation-time value.
   */
  disabled?: () => boolean;
};

// Insertion-ordered by construction, which gives last-registered-first
// resolution for free (see resolveShortcut).
const registry = new Set<KeyAction>();

/**
 * Register an action for as long as its owner lives.
 *
 * Call from a COMPONENT BODY, never from inside a `createEffect`: an effect
 * owner re-runs, which churns the registration and can transiently
 * double-register (kdd/keyboard-layer § consequences).
 */
export const createAction = (spec: KeyActionSpec): KeyAction => {
  const action: KeyAction = {
    ...(spec.name !== undefined ? { name: spec.name } : {}),
    ...(spec.keywords !== undefined ? { keywords: spec.keywords } : {}),
    ...(spec.shortcut !== undefined ? { shortcut: spec.shortcut } : {}),
    ...(spec.disabled !== undefined ? { disabled: spec.disabled } : {}),
    run: spec.run,
    dispose: () => registry.delete(action),
  };
  registry.add(action);
  // Same rule as createFocusTarget / createDebounced: created ownerless (a bare
  // call in a test), the caller owns dispose(). Registering onCleanup would be
  // a no-op plus a dev warning.
  if (getOwner()) onCleanup(action.dispose);
  return action;
};

/**
 * Every currently-registered action, in registration order. An untracked
 * snapshot — the palette takes one per open (KB-P3).
 */
export const registeredActions = (): readonly KeyAction[] => [...registry];

/**
 * The action a key event fires, or undefined.
 *
 * LAST REGISTERED WINS, which is what makes a nested surface shadow the screen
 * beneath it correctly: a line editor's "New item" claims Alt+N over the detail
 * screen's "Add item" while the editor is open, then hands it back on close.
 *
 * Pure with respect to the DOM: the tier gate (KB-1 — whether a focused text
 * field swallows the key) belongs to the dispatcher, which is the only thing
 * that should know what has focus.
 */
export const resolveShortcut = (
  event: KeyboardEvent
): KeyAction | undefined => {
  const all = [...registry];
  for (let i = all.length - 1; i >= 0; i--) {
    const action = all[i];
    if (!action?.shortcut) continue;
    if (action.disabled?.() === true) continue;
    if (matches(action.shortcut, event)) return action;
  }
  return undefined;
};

/*
 * ─── One creation site per generic binding ──────────────────────────────────
 *
 * KB-R2: a generic action's shortcut "is gated on the thing it acts on being
 * present, and on nothing else... A screen offering it and not answering the
 * key is a defect in that screen, not a narrower binding."
 *
 * The way to make that unforgeable is ONE creation site per binding, so
 * `git grep createAddAction` answers "which screens answer Alt+N?" with one hit
 * per screen. The alternative — every add BUTTON declaring the action — breaks
 * on the screens that render two add controls at once (the inbound and
 * internal-order details each have a header SplitButton AND a ghost button in
 * the table's empty slot), and cannot express a `run` that is broader than one
 * button's click.
 */

/**
 * The screen's add / new action (KB-R2, AC-KB7) — a list's _New_, a detail's
 * _Add item_, a line editor's _New item_. Declared by the SCREEN; the controls
 * that trigger it carry only `shortcut={ALT_N}` for their badge and
 * `aria-keyshortcuts`.
 *
 * `name` is the action's own control's label (spec/keyboard ui-surface S1:
 * "the screen's add action, named by its own control"), so the palette entry
 * reads the way the button does.
 */
export const createAddAction = (spec: {
  name: LocaleKey;
  run: () => void;
  disabled?: () => boolean;
}): KeyAction =>
  createAction({
    name: spec.name,
    shortcut: ALT_N,
    run: spec.run,
    ...(spec.disabled !== undefined ? { disabled: spec.disabled } : {}),
  });
