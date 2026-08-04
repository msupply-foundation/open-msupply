import { getOwner, onCleanup } from 'solid-js';
import type { LocaleKey } from '../../intl';
import { ALT_N, matches, type Shortcut } from './shortcuts';
import { useSurfaceActive } from './surfaceActive';

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
  /*
   * An action declared inside a surface that stays MOUNTED while hidden —
   * dialog content — is available only while that surface is showing.
   * `onCleanup` cannot express it, because nothing cleans up when a mounted
   * dialog merely closes, so the surface's own flag folds into `disabled` here
   * (see surfaceActive.ts).
   *
   * Structural, not a rule to remember: an author who declares a binding
   * inside a dialog gets the gate whether or not they knew they needed one.
   * Without it a closed dialog answers its own keys, and an `always`-tier bare
   * character (the line editor's `+`) fires on every screen in the app.
   */
  const surfaceActive = useSurfaceActive();
  const disabled =
    surfaceActive === undefined
      ? spec.disabled
      : () => !surfaceActive() || spec.disabled?.() === true;

  const action: KeyAction = {
    ...(spec.name !== undefined ? { name: spec.name } : {}),
    ...(spec.keywords !== undefined ? { keywords: spec.keywords } : {}),
    ...(spec.shortcut !== undefined ? { shortcut: spec.shortcut } : {}),
    ...(disabled !== undefined ? { disabled } : {}),
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
    // MATCH FIRST, then ask whether it is available. Every keystroke in every
    // text field runs this loop, and a `disabled` predicate is arbitrary
    // app code (it reads store state, resource state, a draft's contents) —
    // evaluating one per registered binding per character typed is work nobody
    // asked for. Order is otherwise identical: a disabled action still declines
    // the binding and the search continues to the rung beneath it.
    if (!matches(action.shortcut, event)) continue;
    if (action.disabled?.() === true) continue;
    return action;
  }
  return undefined;
};

/**
 * Is any registered action currently answering this binding? For a dev-only
 * assertion — a screen that offers a thing but not its generic binding is the
 * KB-R2 defect ("a defect in that screen, not a narrower binding").
 */
export const bindingRegistered = (shortcut: Shortcut): boolean => {
  for (const action of registry) {
    if (action.shortcut === shortcut && action.disabled?.() !== true)
      return true;
  }
  return false;
};

/**
 * Every binding any registered action owns, disabled or not — for the dev-only
 * carrier audit (`src/keyboard/devCarrierAudit.ts`).
 *
 * Ignoring `disabled` is the point, and the difference from
 * `bindingRegistered` is deliberate: `disabled` is transient app state (a list
 * still loading, a record read-only), while an advertised binding nothing owns
 * is DRIFT. A control inert alongside its inert action is correct.
 */
export const declaredBindings = (): readonly Shortcut[] =>
  [...registry].flatMap(action => (action.shortcut ? [action.shortcut] : []));

/*
 * The reverse lookup, in dev only (kdd/keyboard-layer § the honest cost is a
 * lost reverse lookup). From a binding you can grep to its creation site; from
 * a KEYPRESS you cannot read off which entry wins, and the set is the union
 * over whatever is mounted. The showcase's inspector cannot answer it either —
 * it mounts no shell — so the answer has to be available in the running app:
 *
 *   __keyActions()   in the console, on the screen in question.
 *
 * Listed last-registered-first, the order resolveShortcut walks.
 */
if (import.meta.env.DEV && typeof window !== 'undefined') {
  (
    window as unknown as { __keyActions?: () => readonly unknown[] }
  ).__keyActions = () =>
    [...registry].reverse().map(action => ({
      name: action.name ?? '(unlisted)',
      shortcut: action.shortcut,
      disabled: action.disabled?.() === true,
      run: action.run,
    }));
}

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
