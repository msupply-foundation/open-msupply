import { createSignal, onCleanup, untrack } from 'solid-js';

/*
 * One field that saves as-you-type to the server and SHOWS the server's
 * figure — the sibling of createDebouncedEdit for a value the server can
 * change too: a rate derived from the lines it is spread over, or one of two
 * figures that set each other (a discount as a percentage and as an amount).
 * createDebouncedEdit's buffer never takes the server's value back, which is
 * right for a comment and wrong here.
 *
 * So the field shows a DRAFT only while it is being edited — focused, or with
 * a save not yet answered — and the server's value otherwise:
 *
 * - `set(value)` writes the draft now (the field reflects it at once) and
 *   schedules ONE debounced save, so a burst of keystrokes sends one save.
 * - Saves go one at a time. An edit made while a save is on its way waits for
 *   its answer, then the latest draft is sent. Two saves are never in flight
 *   together, so an answer can never arrive after a newer one and put an old
 *   figure back.
 * - While the draft is held no server answer reaches the field, so nothing is
 *   written under the caret — not the 0 a cleared field saved (#1336), nor an
 *   answer to an earlier keystroke landing after a later one (the race on
 *   #1591's review: Backspace then 5 showed, and on blur saved, 0).
 * - `onBlur` saves at once; once nothing is left to save or waiting on an
 *   answer, the draft is dropped and the field shows what the server made of
 *   it (a discount amount converted to a percentage and back).
 *
 * `save` must resolve only once the value the field reads (`value`) carries
 * the answer — a splice, or an awaited re-read — else the field shows the old
 * figure for a moment between dropping the draft and the re-read landing.
 * Like every save here it never throws (kdd/state-management); a refused save
 * leaves the server's figure on show once the field is left.
 *
 * Dispose saves what is pending rather than dropping it (a no-Save-button
 * screen — the same durability rule as createDebouncedEdit).
 */

export interface DebouncedFieldOptions<V> {
  /** The server's figure, shown whenever the field isn't being edited. */
  value: () => V;
  /** Save one value; resolves once `value()` reflects the answer. */
  save: (value: V) => Promise<unknown>;
  /** Trailing debounce delay, in ms. Default 500, as createDebouncedEdit. */
  delayMs?: number;
}

export interface DebouncedField<V> {
  /** The draft while the field is being edited, else the server's figure. */
  value: () => V;
  /** A new figure from the field — held as the draft, saved debounced. */
  set: (value: V) => void;
  /** Wire to the field's focus: it is being edited from now. */
  onFocus: () => void;
  /** Wire to the field's blur: save at once, then show the server's figure. */
  onBlur: () => void;
}

export const createDebouncedField = <V>(
  options: DebouncedFieldOptions<V>
): DebouncedField<V> => {
  const delayMs = options.delayMs ?? 500;
  // Boxed so a draft of `undefined` is still a draft.
  const [draft, setDraft] = createSignal<{ value: V }>();
  let focused = false;
  let unsent = false;
  let inFlight = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const stopTimer = () => {
    clearTimeout(timer);
    timer = undefined;
  };

  // Drop the draft once nothing more is coming for it.
  const release = () => {
    if (!focused && !unsent && !inFlight) setDraft(undefined);
  };

  const send = () => {
    stopTimer();
    const held = untrack(draft);
    // An edit made while a save is on its way goes when that save is answered.
    if (!unsent || inFlight || !held) return;
    unsent = false;
    inFlight = true;
    void options.save(held.value).finally(() => {
      inFlight = false;
      // Edited while this was on its way: send the latest now, unless its
      // debounce is still running (it sends when it fires).
      if (unsent && timer === undefined) send();
      else release();
    });
  };

  const set = (value: V) => {
    setDraft({ value });
    unsent = true;
    stopTimer();
    timer = setTimeout(send, delayMs);
  };

  onCleanup(send);

  return {
    value: () => {
      const held = draft();
      return held ? held.value : options.value();
    },
    set,
    onFocus: () => {
      focused = true;
    },
    onBlur: () => {
      focused = false;
      send();
      release();
    },
  };
};
