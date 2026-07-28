import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot } from 'solid-js';
import { createFocusTarget, createFocusTargets } from './createFocusTarget';

// The contract these tests pin down is the timing one — the part every call
// site used to hand-roll with requestAnimationFrame + a querySelector, and got
// subtly differently each time:
//
//   1. focus() never lands synchronously (inside a Dialog it must land AFTER
//      showModal() has parked focus on the panel);
//   2. a request made BEFORE the control mounts still lands, once it does —
//      so a caller never needs a "has it loaded yet" gate;
//   3. a detached element (Solid doesn't null a ref on unmount) is never
//      focused, and the request waits for the replacement instead;
//   4. landing scrolls first, then focuses with preventScroll — so a DISABLED
//      control (an uncounted batch row) is still revealed, which a bare
//      focus() would not do.
//
// The tests run in the node environment (vitest.config.ts), so rAF is stubbed
// with a manual queue and the "element" is the minimal shape the primitive
// touches.

const fakeElement = (isConnected = true) => {
  const focus = vi.fn();
  const scrollIntoView = vi.fn();
  const el = { isConnected, focus, scrollIntoView };
  // The primitive only reads isConnected and calls scrollIntoView/focus; a real
  // HTMLElement is not needed to exercise its logic.
  return { el: el as unknown as HTMLElement, focus, scrollIntoView };
};

let frames: Array<() => void> = [];

// Run every frame queued so far (a callback queueing another frame is left for
// the next flush, matching a real rAF).
const flushFrame = () => {
  const queued = frames;
  frames = [];
  for (const callback of queued) callback();
};

beforeEach(() => {
  frames = [];
  vi.stubGlobal('requestAnimationFrame', (callback: () => void) => {
    frames.push(callback);
    return frames.length;
  });
  vi.stubGlobal('cancelAnimationFrame', (handle: number) => {
    frames[handle - 1] = () => {};
  });
});

afterEach(() => vi.unstubAllGlobals());

describe('createFocusTarget', () => {
  it('focuses on the next frame, not synchronously', () =>
    createRoot(dispose => {
      const target = createFocusTarget();
      const { el, focus } = fakeElement();
      target.ref(el);

      target.focus();
      expect(focus).not.toHaveBeenCalled();

      flushFrame();
      expect(focus).toHaveBeenCalledTimes(1);
      dispose();
    }));

  it('scrolls into view, then focuses without a second scroll', () =>
    createRoot(dispose => {
      const target = createFocusTarget();
      const { el, focus, scrollIntoView } = fakeElement();
      target.ref(el);

      target.focus();
      flushFrame();
      expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest' });
      expect(focus).toHaveBeenCalledWith({ preventScroll: true });
      dispose();
    }));

  it('lands a request made before the control mounts', () =>
    createRoot(dispose => {
      const target = createFocusTarget();
      // The control renders behind a <Show> the same action just flipped, or a
      // load that hasn't settled — so nothing is attached yet.
      target.focus();
      flushFrame();

      const { el, focus } = fakeElement();
      target.ref(el);
      expect(focus).not.toHaveBeenCalled();

      flushFrame();
      expect(focus).toHaveBeenCalledTimes(1);
      dispose();
    }));

  it('waits for the replacement rather than focusing a detached node', () =>
    createRoot(dispose => {
      const target = createFocusTarget();
      // Solid doesn't null a ref on unmount, so the handle can be holding the
      // previous mount's element when the request is made.
      const stale = fakeElement(false);
      target.ref(stale.el);

      target.focus();
      flushFrame();
      expect(stale.focus).not.toHaveBeenCalled();

      const fresh = fakeElement();
      target.ref(fresh.el);
      flushFrame();
      expect(fresh.focus).toHaveBeenCalledTimes(1);
      dispose();
    }));

  it('fires once per request, not once per frame', () =>
    createRoot(dispose => {
      const target = createFocusTarget();
      const { el, focus } = fakeElement();
      target.ref(el);

      target.focus();
      flushFrame();
      flushFrame();
      expect(focus).toHaveBeenCalledTimes(1);

      target.focus();
      flushFrame();
      expect(focus).toHaveBeenCalledTimes(2);
      dispose();
    }));

  it('cancel() drops an armed request', () =>
    createRoot(dispose => {
      const target = createFocusTarget();
      const { el, focus } = fakeElement();
      target.ref(el);

      target.focus();
      target.cancel();
      flushFrame();
      expect(focus).not.toHaveBeenCalled();

      // A cancel doesn't disarm the handle for good — the next request works.
      target.focus();
      flushFrame();
      expect(focus).toHaveBeenCalledTimes(1);
      dispose();
    }));

  it('a disposed owner never steals focus', () => {
    let target!: ReturnType<typeof createFocusTarget>;
    const dispose = createRoot(disposeRoot => {
      target = createFocusTarget();
      return disposeRoot;
    });
    const { el, focus } = fakeElement();
    target.ref(el);

    target.focus();
    dispose();
    flushFrame();
    expect(focus).not.toHaveBeenCalled();
  });
});

describe('createFocusTargets (keyed)', () => {
  it('focuses the control registered for the requested key', () =>
    createRoot(dispose => {
      const targets = createFocusTargets();
      const a = fakeElement();
      const b = fakeElement();
      targets.ref('a')(a.el);
      targets.ref('b')(b.el);

      targets.focus('b');
      flushFrame();
      expect(a.focus).not.toHaveBeenCalled();
      expect(b.focus).toHaveBeenCalledTimes(1);
      dispose();
    }));

  it('waits for a row that has not rendered yet — no load gate needed', () =>
    createRoot(dispose => {
      const targets = createFocusTargets();
      // The line editor asks for the clicked batch before its draft has been
      // seeded, so no row carries that key yet.
      targets.focus('line-7');
      flushFrame();

      const other = fakeElement();
      targets.ref('line-3')(other.el);
      flushFrame();
      // An unrelated row attaching must not swallow the request.
      expect(other.focus).not.toHaveBeenCalled();

      const wanted = fakeElement();
      targets.ref('line-7')(wanted.el);
      flushFrame();
      expect(wanted.focus).toHaveBeenCalledTimes(1);
      dispose();
    }));

  it('a key whose control never appears simply never lands', () =>
    createRoot(dispose => {
      const targets = createFocusTargets();
      const present = fakeElement();
      targets.ref('here')(present.el);

      // A stale line id — the row is gone from this item's batches.
      targets.focus('vanished');
      flushFrame();
      flushFrame();
      expect(present.focus).not.toHaveBeenCalled();
      dispose();
    }));

  it('a newer request replaces the one still waiting', () =>
    createRoot(dispose => {
      const targets = createFocusTargets();
      targets.focus('first');
      targets.focus('second');

      const first = fakeElement();
      const second = fakeElement();
      targets.ref('first')(first.el);
      targets.ref('second')(second.el);
      flushFrame();

      expect(first.focus).not.toHaveBeenCalled();
      expect(second.focus).toHaveBeenCalledTimes(1);
      dispose();
    }));

  it('get() returns only an attached element', () =>
    createRoot(dispose => {
      const targets = createFocusTargets();
      const live = fakeElement();
      const stale = fakeElement(false);
      targets.ref('live')(live.el);
      targets.ref('stale')(stale.el);

      expect(targets.get('live')).toBe(live.el);
      expect(targets.get('stale')).toBeUndefined();
      expect(targets.get('never-registered')).toBeUndefined();
      dispose();
    }));
});
