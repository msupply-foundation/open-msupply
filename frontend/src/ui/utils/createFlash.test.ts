import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot } from 'solid-js';
import { createFlash, FLASH_MS } from './createFlash';

// The self-clearing outcome primitive: show() reverts on its own, a second
// show() supersedes rather than inheriting the first's clock, clear() reverts
// now, and the ownership guard means an ownerless caller neither throws nor
// leaks. Fake timers drive the revert.

describe('createFlash', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('shows a value and reverts after the flash duration', () => {
    createRoot(dispose => {
      const flash = createFlash<'done' | 'failed'>();
      expect(flash.value()).toBeUndefined();
      flash.show('done');
      expect(flash.value()).toBe('done');
      vi.advanceTimersByTime(FLASH_MS - 1);
      expect(flash.value()).toBe('done');
      vi.advanceTimersByTime(1);
      expect(flash.value()).toBeUndefined();
      dispose();
    });
  });

  it('a second show supersedes the first and restarts the clock', () => {
    createRoot(dispose => {
      const flash = createFlash<'done' | 'failed'>();
      flash.show('done');
      vi.advanceTimersByTime(FLASH_MS - 100);
      // Superseding must not inherit the first outcome's remaining time — the
      // failure would otherwise vanish 100ms after appearing.
      flash.show('failed');
      expect(flash.value()).toBe('failed');
      vi.advanceTimersByTime(FLASH_MS - 1);
      expect(flash.value()).toBe('failed');
      vi.advanceTimersByTime(1);
      expect(flash.value()).toBeUndefined();
      dispose();
    });
  });

  it('clear reverts immediately and cancels the pending revert', () => {
    createRoot(dispose => {
      const flash = createFlash<'done'>();
      flash.show('done');
      flash.clear();
      expect(flash.value()).toBeUndefined();
      // The cancelled timer must not fire later against a cleared flash.
      expect(() => vi.advanceTimersByTime(FLASH_MS)).not.toThrow();
      expect(flash.value()).toBeUndefined();
      dispose();
    });
  });

  it('honours a custom duration', () => {
    createRoot(dispose => {
      const flash = createFlash<'done'>(500);
      flash.show('done');
      vi.advanceTimersByTime(500);
      expect(flash.value()).toBeUndefined();
      dispose();
    });
  });

  it('disposing the owner cancels a pending revert', () => {
    let flash!: ReturnType<typeof createFlash<'done'>>;
    const dispose = createRoot(d => {
      flash = createFlash<'done'>();
      flash.show('done');
      return d;
    });
    dispose();
    expect(flash.value()).toBeUndefined();
    // No timer left to fire against the disposed owner.
    expect(vi.getTimerCount()).toBe(0);
  });

  it('created ownerless it neither throws nor registers a cleanup', () => {
    // Bare call, no createRoot — the caller owns disposal via clear().
    const flash = createFlash<'done'>();
    expect(() => flash.show('done')).not.toThrow();
    expect(flash.value()).toBe('done');
    flash.clear();
    expect(vi.getTimerCount()).toBe(0);
  });
});
