// A USB scanner in keyboard-wedge mode: it types the barcode as if it were a
// keyboard, so the only way to read it is to watch keystrokes and tell a
// scanner's inhuman speed from a person's typing.
//
// All the judgement lives in ./wedgeDetect.ts, which is pure and
// separately tested. This module is the DOM half: capture keystrokes, act on
// what the decoder concludes, and put back whatever turned out to be typing.
//
// It runs in the RENDERER. The reference app does this in the Electron main
// process, intercepting `before-input-event`, re-injecting human keystrokes
// with `sendInputEvent`, and guarding the buffer with a busy-wait spinlock
// inside a synchronous handler. None of that is necessary here — and doing it
// in the page means one implementation covers desktop, Android and a plain
// browser tab instead of Electron alone.

import { t } from '../../intl';
import {
  emptyWedgeState,
  feedKey,
  flushWedge,
  WEDGE_DEFAULTS,
  type WedgeOutcome,
  type WedgeState,
} from './wedgeDetect';
import type { ListenResult, ScanHandlers } from './source';

// --- Putting characters back --------------------------------------------
//
// execCommand is deprecated but remains the only way to change an input's
// value while firing the native input events the page's own bindings listen
// for, and keeping the browser's undo stack intact. Setting `.value` directly
// does neither, which a Solid-bound field notices immediately. The target is
// Chromium 132+ (browserslist), where this is solid.

const editableTarget = (): HTMLInputElement | HTMLTextAreaElement | undefined => {
  const el = document.activeElement;
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    return el.readOnly || el.disabled ? undefined : el;
  }
  return undefined;
};

/** Give back keystrokes that turned out to be typing, not a scan. */
const replay = (text: string): void => {
  if (text === '' || !editableTarget()) return;
  document.execCommand('insertText', false, text);
};

/**
 * Remove the characters a scan leaked into the focused field before it was
 * recognised as a scan. Without this a barcode's first character lands in
 * whatever the user was filling in — during receiving that is the quantity
 * box, and scanning on SAVES the line, so the stray digit would be persisted.
 */
const unleak = (count: number): void => {
  const el = editableTarget();
  if (!el || count <= 0) return;
  const caret = el.selectionStart;
  if (caret === null || caret < count) return;
  el.setSelectionRange(caret - count, caret);
  document.execCommand('delete');
};

// --- The armed listener ---------------------------------------------------

let state: WedgeState = emptyWedgeState();
let timer: ReturnType<typeof setTimeout> | undefined;
let detach: (() => void) | undefined;

const act = (outcome: WedgeOutcome | undefined, handlers: ScanHandlers): void => {
  if (!outcome) return;
  switch (outcome.kind) {
    case 'barcode':
      unleak(outcome.leakedChars);
      // The key POSITIONS, unmapped: which characters they mean depends on
      // the layout the scanner emits against, and that belongs one layer up
      // (src/domain/barcode) where it can be configured per site rather
      // than hardcoded into a DOM listener.
      handlers.onScan({ kind: 'keystrokes', keys: outcome.keys });
      return;
    case 'corrupt':
      // Never hand up a code with a character missing: it would be learned
      // into the registry as a distinct, wrong key, and no screen in the app
      // can list or correct one (spec/barcode-scanning/rules.md § The book
      // has no maintenance surface). The keystrokes go with the failure —
      // the key that could not be placed is the only thing that explains it,
      // and is usually a separator spelled a way this app does not know yet.
      unleak(1);
      handlers.onError?.({
        message: t('error.unable-to-read-barcode'),
        raw: { kind: 'keystrokes', keys: outcome.keys },
      });
      return;
    case 'typing':
      replay(outcome.replay);
  }
};

export const listenToKeyboardWedge = async (
  handlers: ScanHandlers
): Promise<ListenResult> => {
  await releaseKeyboardWedge();
  if (typeof document === 'undefined') {
    return { ok: false, message: 'no document' };
  }

  const onKeyDown = (event: KeyboardEvent) => {
    // A held key is one keystroke repeating, not a scanner: the reference app
    // drops these too, and letting them through would look like impossible
    // typing speed.
    if (event.repeat) return;

    // Ctrl is BOTH the user's shortcut modifier and how a wedge scanner
    // sends a character no key produces — Ctrl+] is the GS1 field
    // separator. Which one it is depends entirely on whether a scan is
    // already underway: mid-run it is the scanner, otherwise it is the user
    // reaching for Ctrl+C.
    //
    // Getting this wrong is silent and expensive. Dropping every Ctrl
    // combination loses the separator, and a GS1 label whose
    // variable-length field is followed by another field then cannot be
    // split at all — the serial and the expiry run together into one value
    // that looks plausible and is wrong.
    const scanUnderway = state.run !== undefined;
    if (event.metaKey) return;
    if (event.ctrlKey && !scanUnderway) return;

    const step = feedKey(
      state,
      {
        code: event.code,
        shift: event.shiftKey,
        alt: event.altKey,
        ctrl: event.ctrlKey,
        // What the OS produced through the USER's layout — only ever used to
        // give typing back (wedgeDetect.ts § CapturedKey).
        ...([...event.key].length === 1 ? { typed: event.key } : {}),
      },
      event.timeStamp,
      WEDGE_DEFAULTS
    );
    state = step.state;
    if (step.suppress) {
      // preventDefault alone stops the character reaching the field, but
      // the event still travels on to every keydown handler on the way —
      // so the scanner's Enter would submit a search or confirm a form, and
      // its letters would fire any single-key shortcut. This listener is on
      // the document in the capture phase, so it runs first and can stop it.
      event.preventDefault();
      event.stopImmediatePropagation();
    }
    act(step.completed, handlers);

    // An open run is closed by silence. Without this, the last scan of a
    // burst would sit in the buffer until the next keystroke — which on the
    // receiving screen might be minutes later, or never.
    clearTimeout(timer);
    if (state.run) {
      timer = setTimeout(() => {
        const end = flushWedge(state);
        state = end.state;
        act(end.completed, handlers);
      }, WEDGE_DEFAULTS.maxMsBetweenKeys);
    }
  };

  // Capture phase, on the document: the keystroke has to be intercepted
  // before the focused field consumes it, wherever focus happens to be.
  document.addEventListener('keydown', onKeyDown, { capture: true });
  detach = () => document.removeEventListener('keydown', onKeyDown, { capture: true });
  return { ok: true };
};

export const releaseKeyboardWedge = async (): Promise<void> => {
  clearTimeout(timer);
  timer = undefined;
  detach?.();
  detach = undefined;
  // Anything half-captured is abandoned rather than reported: a partial run
  // at disarm time is not a barcode.
  state = emptyWedgeState();
};
