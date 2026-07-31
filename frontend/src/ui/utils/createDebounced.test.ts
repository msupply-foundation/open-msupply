import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot } from 'solid-js';
import { createDebounced } from './createDebounced';

// The trailing-debounce primitive: collapse rapid calls to one trailing
// invocation with the latest args; flush()/cancel() semantics; and the
// ownership guard — created ownerless it must NOT throw or register a cleanup,
// leaving disposal to the caller's cancel(). Fake timers drive the delay.

describe('createDebounced', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('collapses rapid calls into one trailing invocation with the latest args', () => {
    const fn = vi.fn();
    createRoot(dispose => {
      const d = createDebounced((v: string) => fn(v), 500);
      d('a');
      d('ab');
      d('abc');
      expect(fn).not.toHaveBeenCalled();
      vi.advanceTimersByTime(500);
      expect(fn).toHaveBeenCalledTimes(1);
      expect(fn).toHaveBeenCalledWith('abc');
      dispose();
    });
  });

  it('flush runs the pending call immediately; a second flush is a no-op', () => {
    const fn = vi.fn();
    createRoot(dispose => {
      const d = createDebounced((v: string) => fn(v), 500);
      d('x');
      d.flush();
      expect(fn).toHaveBeenCalledTimes(1);
      d.flush(); // nothing pending → no-op
      expect(fn).toHaveBeenCalledTimes(1);
      dispose();
    });
  });

  it('cancel drops the pending call; a later flush does nothing', () => {
    const fn = vi.fn();
    createRoot(dispose => {
      const d = createDebounced((v: string) => fn(v), 500);
      d('x');
      d.cancel();
      vi.advanceTimersByTime(1000);
      d.flush();
      expect(fn).not.toHaveBeenCalled();
      dispose();
    });
  });

  // Once the owner is gone, nothing may run on its behalf — the case that bit a
  // filter chip (#563): the chip's box loses focus BECAUSE the chip was removed,
  // the browser reports that afterwards, and the flush wrote the removed
  // filter's value straight back. Re-arming first is what makes it more than
  // cancel-on-cleanup: the buffer the cleanup emptied is refilled.
  it('runs nothing after its owner is disposed, even when flush re-arms it', () => {
    const fn = vi.fn();
    let d!: ReturnType<typeof createDebounced<[string]>>;
    createRoot(dispose => {
      d = createDebounced((v: string) => fn(v), 500);
      dispose();
    });

    d('after'); // re-arms the buffer that cleanup emptied
    d.flush();
    vi.advanceTimersByTime(1000); // and the timer that arming scheduled
    expect(fn).not.toHaveBeenCalled();
  });

  it('drops a call already pending when its owner is disposed', () => {
    const fn = vi.fn();
    createRoot(dispose => {
      const d = createDebounced((v: string) => fn(v), 500);
      d('pending');
      dispose();
      vi.advanceTimersByTime(1000);
      d.flush();
    });
    expect(fn).not.toHaveBeenCalled();
  });

  // The ownership guard: created OUTSIDE a reactive owner (no createRoot), it
  // must not throw and must still work; the caller owns disposal via cancel()
  // (there's no owner to auto-cancel).
  it('works when created ownerless, and cancel() disposes the pending timer', () => {
    const fn = vi.fn();
    const d = createDebounced((v: string) => fn(v), 500); // no createRoot — ownerless
    d('x');
    vi.advanceTimersByTime(500);
    expect(fn).toHaveBeenCalledWith('x');

    // cancel() is the ownerless caller's disposal: a pending call is dropped,
    // timer cleared.
    d('y');
    d.cancel();
    vi.advanceTimersByTime(1000);
    expect(fn).toHaveBeenCalledTimes(1); // still just the 'x' from before
  });
});
