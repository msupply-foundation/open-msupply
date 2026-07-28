import { createEffect, on, onCleanup, untrack } from 'solid-js';
import { createStore, produce, reconcile, type Store } from 'solid-js/store';
import { createDebounced } from '../../ui/utils/createDebounced';

/*
 * A debounced edit buffer for a detail view / side panel that saves
 * as-you-type (no Save button).
 *
 * The shape you get: a `createStore` seeded from the initial entity, read by
 * the field components; `setField(key, value)` writes the store IMMEDIATELY
 * (so the input reflects instantly) and marks that key dirty. A SINGLE
 * debounce runs across the whole buffer: after the last edit settles it fires
 * ONE `save(patch)` carrying every field that changed since the previous save.
 * So editing counted-by then verified-by in quick succession sends one
 * mutation with both keys, not two.
 *
 * The store is NEVER re-hydrated from the save result — a save returning the
 * fresh node must not clobber what the user is still typing (the debounce
 * would appear to "stop" editing). This is the buffer + identity-seed +
 * debounced-save that the stocktake description / side-panel fields each
 * hand-rolled, lifted to one reusable primitive.
 *
 * Why `id()` / the re-seed: a detail view seeds its buffer ONCE, then self-owns the values for the
 * lifetime of that entity — so far `id` earns nothing. It earns its keep in exactly one case:
 * @solidjs/router REUSES the same component instance when only a route PARAM changes (navigating
 * `/stocktakes/A` → `/stocktakes/B` does NOT remount StocktakeDetailView — same instance, new
 * `params.stocktakeId`, the resource refetches and `initial()` now reads B's node). Without a
 * re-seed the buffer would still show A's edited values against B. Keying the seed effect on `id()`
 * refills the store when — and only when — the entity identity changes, never on a value edit. It's
 * latent for stocktakes today (list→detail is a fresh mount; no detail→detail nav wired yet) but
 * cheap insurance: the day such a nav is added, the fields stay correct with no extra work. Pass
 * the entity id; if a view genuinely can never be reused across entities, `id` simply never fires.
 *
 * The mutation itself stays OUT of here (kdd/state-management): `save`
 * receives a patch and the vertical owns firing `runXUpdate` and splicing the
 * result back with no refetch. This helper only decides WHEN to save and WHAT
 * changed.
 *
 * Durability — the no-Save-button contract means an in-flight patch must NOT
 * be silently lost when an editing session ends. Both transition paths FLUSH,
 * never drop:
 *   - dispose (route change away from the detail view — a real, wired flow):
 *   onCleanup flushes, so
 *     typing then clicking a nav link within the debounce window still saves.
 *     The save fires as the owner tears down; its splice-back writes to a
 *     now-dead signal (a harmless no-op), but the mutation still reaches the
 *     server — which is the point.
 *   - re-seed (id() change — the latent detail→detail nav): the previous
 *   entity's pending patch is
 *     flushed BEFORE the store is reseeded, so A's edits persist before B's
 *     values load. Safe because at that instant the store still holds A's
 *     edited values.
 * flush() is also exposed for explicit save-on-blur; cancel() (drop without
 * saving) stays available for a caller that genuinely wants to discard.
 */

export interface DebouncedEditOptions<T extends object> {
  /**
   * The entity's identity. When it changes the buffer re-seeds from
   * `initial()` (a different entity, e.g. navigating detail views without a
   * remount). It must NOT change on a mere value edit — otherwise a
   * save-then-reseed would wipe the user's in-progress typing.
   */
  id: () => string;
  /** The seed values, read whenever `id()` changes (and once up front). */
  initial: () => T;
  /**
   * Fire the mutation with the accumulated patch — every field changed since
   * the last save. Called once per settled burst of edits, never per
   * keystroke.
   */
  save: (patch: Partial<T>) => void;
  /**
   * Trailing debounce delay, in ms. Defaults to 500 (the stocktake field
   * delay).
   */
  delayMs?: number;
}

export interface DebouncedEdit<T extends object> {
  /**
   * The working values — read fine-grained by field components
   * (`state.comment`, …).
   */
  state: Store<T>;
  /**
   * Update one field: writes the store now (input reflects instantly), marks
   * the key dirty, and (re)schedules the single debounced save. Setting a
   * value `===` the one the store already holds is a no-op (nothing dirtied,
   * no save scheduled). NB the guard is reference/primitive equality: this
   * buffer is for scalar text fields (the equality holds for
   * strings/numbers/booleans); an object-valued field re-passed as a
   * fresh-but-equal reference would dirty and save.
   */
  setField: <K extends keyof T>(key: K, value: T[K]) => void;
  /**
   * Save the pending patch now, if any (save-on-blur / before navigating
   * away).
   */
  flush: () => void;
  /** Drop the pending patch without saving it. */
  cancel: () => void;
}

export const createDebouncedEdit = <T extends object>(
  options: DebouncedEditOptions<T>
): DebouncedEdit<T> => {
  const delayMs = options.delayMs ?? 500;
  const [state, setState] = createStore<T>(options.initial());

  // The keys edited since the last save — accumulated so one debounced save
  // sends the whole patch. A Set (not the values) because the current value is
  // always read fresh from the store at save time, so a key edited twice in one
  // burst still sends only its latest value, once.
  let dirty = new Set<keyof T>();

  // ONE debounce for the whole buffer. When it fires, build the patch from the
  // dirty keys' current store values and clear the set. createDebounced
  // registers its own onCleanup, so a pending save is dropped when this owner
  // disposes.
  const saveDirty = createDebounced(() => {
    if (dirty.size === 0) return;
    const patch: Partial<T> = {};
    dirty.forEach(key => {
      patch[key] = state[key];
    });
    dirty = new Set();
    options.save(patch);
  }, delayMs);

  const setField = <K extends keyof T>(key: K, value: T[K]) => {
    if (state[key] === value) return; // no real change → don't dirty or schedule
    setState(produce((draft: T) => void (draft[key] = value)));
    dirty.add(key);
    saveDirty();
  };

  const flush = () => saveDirty.flush();
  const cancel = () => {
    saveDirty.cancel();
    dirty = new Set();
  };

  // Re-seed on identity change only (never on value). `defer: true` so the
  // initial run doesn't re-seed over the store we just created. FLUSH the
  // previous entity's pending patch first (its edits must survive the
  // transition — the store still holds A's values at this instant), THEN
  // reconcile to the new entity's values. `reconcile(..., { merge: true })`
  // diffs the flat record key-by-key (our T has no `id` field to key on, so
  // merge is the correct keyless form) — a plain replace that only notifies the
  // readers of changed keys.
  //
  // The same-id guard is load-bearing: `id()` usually derives from the view's
  // entity resource (`node().id`), so the effect ALSO re-runs whenever a save
  // splices a fresh node back — same id string, new upstream signal (`on`
  // re-fires on any source change; it never equality-checks the derived
  // value). Re-seeding on that splice would overwrite the buffer with the
  // server echo — wiping in-flight typing, and reverting a buffered value the
  // echo disagrees with (how the custom-fields clear used to snap back).
  //
  // The seeded id is tracked EXPLICITLY, not via `on`'s prevInput with
  // `defer: true`: a deferred first run returns BEFORE `on` records
  // prevInput, so when the id is already resolved at mount (the toolbar
  // case — no ''→id transition to burn the slot) the first splice would
  // arrive with prevId === undefined and slip past the guard. Seeding at
  // setup and comparing ourselves guards every splice including the first;
  // the effect's own first run compares equal and no-ops, so no defer.
  let seededId = untrack(options.id);
  createEffect(
    on(options.id, id => {
      if (id === seededId) return; // same entity — a node splice, not a nav
      seededId = id;
      flush();
      setState(reconcile(options.initial(), { merge: true }));
    })
  );

  // Flush (NOT cancel) on dispose: a route change away from the detail view is
  // a real flow, and a no-Save-button buffer must persist an in-flight patch
  // rather than drop it. This runs before the inner debounce's own cleanup
  // (later-registered cleanups run first), so `pending` is still live.
  onCleanup(flush);

  return { state, setField, flush, cancel };
};
