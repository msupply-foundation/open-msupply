import { getOwner, onCleanup } from 'solid-js';

/*
 * A focus destination the owner holds a REFERENCE to: "this control is what the
 * user should be acting on next". The owner creates a handle, binds it to a
 * control with a ref, and calls focus() when an action should land there — a
 * dialog opening, a "Save & next" advance, a form reseed, a picker cleared back
 * to its search, a row-click opening an editor on that row's field.
 *
 * Nothing here identifies a control by any DOM-facing string — no test id, no
 * selector, no element name. The binding is the `ref`; what a caller holds is a
 * value in its own scope. Two shapes, one core:
 *
 *   createFocusTarget()   — ONE control, identified by the const the owner
 *                           binds it to. The item search, the Issue field, a
 *                           form's Name input.
 *   createFocusTargets()  — one control PER ROW of a collection, identified by
 *                           the row's own DATA key (the same id the draft store
 *                           is keyed on) — a row id, a filter key. Still a ref
 *                           binding; the key selects WHICH ref, and never
 *                           reaches the DOM.
 *
 * Why a handle rather than the obvious alternatives (kdd/focus-targets):
 *
 *  - Native `autofocus` fires ONCE, on the element's initial mount. Every
 *    "focus it again after X" case — the whole point of this primitive — is a
 *    state change that does NOT remount (kdd/solid-reactivity-pitfalls § no
 *    remounts on interaction), so autofocus cannot re-fire. Inside a Dialog it
 *    never fires at all: the dialog panel outranks it.
 *  - `document.querySelector('[data-testid="…"]')` reaches for a TEST hook as
 *    app wiring (e2e/TESTIDS.md is a contract with the test suites, not an
 *    internal API), searches the whole document, and silently finds nothing
 *    when a renderer doesn't emit that id — which is exactly how the line
 *    editors' row focus was dead in card view.
 *  - A bare element ref can't reach a compound control's inner input —
 *    Combobox's `<input>` is inside the Kobalte composition. Such controls
 *    take `focusTarget` and bind the handle to their real focusable.
 *
 * `ref` IS a plain Solid ref callback, so a control that already forwards
 * `ref` to its focusable (TextField, NumberField) needs no new prop:
 * `ref={target.ref}` / `ref={targets.ref(row.id)}`.
 *
 * Timing — the part every call site used to hand-roll: a request is ARMED, not
 * applied. It lands on the next frame, and if the control isn't attached yet
 * (it renders behind a `<Show>` the same action just flipped, or a load that
 * hasn't settled) the request stays armed and lands the moment that control
 * attaches. So a caller never has to know whether its target is in the DOM
 * yet — no load gate, no deferred "pending focus" signal. A key that never
 * attaches (a stale row id) simply never lands.
 *
 * Landing SCROLLS then focuses. `focus()` scrolls on its own, but only when it
 * actually moves focus — a disabled control would stay off-screen. Revealing a
 * disabled row is wanted (an uncounted batch a row-click opened), so the scroll
 * is explicit and the focus is `preventScroll`, giving exactly one scroll.
 *
 * An armed request survives until it lands, `cancel()` drops it, a newer
 * request replaces it, or the owner disposes. It never touches a detached node.
 *
 * Ownership: the auto-cancel-on-dispose needs a reactive owner. Created
 * ownerless (a bare call in a test), the caller owns `cancel()` — registering
 * onCleanup would only be a no-op plus a dev warning. Same rule as
 * createDebounced.
 */

export interface FocusTarget {
  /**
   * Solid ref callback for the control that should take focus. Pass straight
   * to a native element (`ref={target.ref}`) or via `focusTarget` on a
   * compound control.
   */
  ref: (el: HTMLElement) => void;
  /**
   * Focus the control on the next frame — or as soon as it attaches, if it
   * isn't mounted yet. Scrolls it into view either way.
   */
  focus: () => void;
  /** Drop an armed request that hasn't landed. */
  cancel: () => void;
}

export interface KeyedFocusTargets {
  /**
   * Solid ref callback for the control identified by `key` — the row id, the
   * filter key, whatever addresses the item. Call it per rendered item:
   * `ref={targets.ref(row.id)}`.
   */
  ref: (key: string) => (el: HTMLElement) => void;
  /**
   * Focus the control for `key` on the next frame — or as soon as it attaches.
   * A key whose control never appears never lands.
   */
  focus: (key: string) => void;
  /**
   * The attached element registered for `key`, for the rare caller that needs
   * more than focus (the filter bar dispatches a pointer event to open a chip's
   * chooser). Prefer `focus`.
   */
  get: (key: string) => HTMLElement | undefined;
  /** Drop an armed request that hasn't landed. */
  cancel: () => void;
}

// The shared core. Both public shapes are a keyed registry; the singular one
// just uses a constant key.
const createRegistry = () => {
  const elements = new Map<string, HTMLElement>();
  // The key whose control is waiting to be focused, if any.
  let armed: string | undefined;
  let frame: number | undefined;

  const attached = (key: string) => {
    const el = elements.get(key);
    // Solid doesn't null a ref on unmount, so an entry can be a detached node
    // from a previous mount.
    return el?.isConnected ? el : undefined;
  };

  const land = () => {
    if (armed === undefined) return;
    const el = attached(armed);
    // Not there yet — stay armed so the request lands when it attaches.
    if (!el) return;
    armed = undefined;
    el.scrollIntoView({ block: 'nearest' });
    el.focus({ preventScroll: true });
  };

  // One frame: the request follows a state change the browser hasn't painted,
  // and inside a Dialog it must land after showModal() has put focus on the
  // dialog panel.
  const schedule = () => {
    if (frame !== undefined) return;
    frame = requestAnimationFrame(() => {
      frame = undefined;
      land();
    });
  };

  const cancel = () => {
    armed = undefined;
    if (frame !== undefined) {
      cancelAnimationFrame(frame);
      frame = undefined;
    }
  };

  if (getOwner()) onCleanup(cancel);

  return {
    // Registering the key we're waiting on is what lands a request made before
    // the control existed. The map is keyed, so it's bounded by the number of
    // distinct keys the owner ever renders, not by re-renders.
    set: (key: string, el: HTMLElement) => {
      elements.set(key, el);
      if (armed === key) schedule();
    },
    request: (key: string) => {
      armed = key;
      schedule();
    },
    get: attached,
    cancel,
  };
};

// The singular handle's key. Never collides — it has a registry to itself.
const ONLY = '';

export const createFocusTarget = (): FocusTarget => {
  const registry = createRegistry();
  return {
    ref: el => registry.set(ONLY, el),
    focus: () => registry.request(ONLY),
    cancel: registry.cancel,
  };
};

export const createFocusTargets = (): KeyedFocusTargets => {
  const registry = createRegistry();
  return {
    ref: key => el => registry.set(key, el),
    focus: registry.request,
    get: registry.get,
    cancel: registry.cancel,
  };
};
