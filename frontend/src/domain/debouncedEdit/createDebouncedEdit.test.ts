import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot } from 'solid-js';
import { createDebouncedEdit } from './createDebouncedEdit';

// The debounced-edit buffer's load-bearing behaviours: a field write reflects
// in the store immediately; ONE debounce runs across the whole buffer and fires
// a single save carrying every field changed since the last save; flush/cancel
// act on that pending patch; writing the value the store already holds is a
// no-op. Run inside createRoot so onCleanup has an owner; fake timers drive the
// debounce.
//
// NOTE: the identity-change RE-SEED is driven by a createEffect. These unit
// tests run in vitest's node environment, where solid-js resolves to its SERVER
// build (createEffect does not run reactively — SSR renders once). So the
// re-seed path can't be exercised here; it's the same `on(id, …, {defer:true})`
// pattern the fields hand-rolled before and is verified in the running app (the
// fields re-seed when navigating between stocktakes without a remount).

describe('createDebouncedEdit', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('writes the store immediately and saves debounced (collapsing rapid edits to one save)', () => {
    const save = vi.fn();
    createRoot(dispose => {
      const edit = createDebouncedEdit<{ description: string }>({
        id: () => 'a',
        initial: () => ({ description: '' }),
        save,
        delayMs: 500,
      });

      edit.setField('description', 'h');
      edit.setField('description', 'he');
      edit.setField('description', 'hel');

      // Store reflects the latest keystroke instantly...
      expect(edit.state.description).toBe('hel');
      // ...but nothing has saved yet.
      expect(save).not.toHaveBeenCalled();

      vi.advanceTimersByTime(500);

      // A single trailing save with the latest value.
      expect(save).toHaveBeenCalledTimes(1);
      expect(save).toHaveBeenCalledWith({ description: 'hel' });
      dispose();
    });
  });

  it('coalesces edits across DIFFERENT fields into ONE save carrying every changed key', () => {
    const save = vi.fn();
    createRoot(dispose => {
      const edit = createDebouncedEdit<{ a: string; b: string; c: string }>({
        id: () => 'x',
        initial: () => ({ a: '', b: '', c: '' }),
        save,
        delayMs: 500,
      });

      // Edit a, then b within the debounce window — each edit reschedules the
      // single timer.
      edit.setField('a', 'a1');
      vi.advanceTimersByTime(300);
      edit.setField('b', 'b1');
      vi.advanceTimersByTime(300); // 300ms since b → timer NOT yet elapsed (rescheduled by b)
      expect(save).not.toHaveBeenCalled();

      vi.advanceTimersByTime(200); // 500ms since the last edit → fire

      // ONE save with BOTH changed fields (c untouched → absent from the
      // patch).
      expect(save).toHaveBeenCalledTimes(1);
      expect(save).toHaveBeenCalledWith({ a: 'a1', b: 'b1' });
      dispose();
    });
  });

  it('a second burst after a save patches only the newly-changed fields', () => {
    const save = vi.fn();
    createRoot(dispose => {
      const edit = createDebouncedEdit<{ a: string; b: string }>({
        id: () => 'x',
        initial: () => ({ a: '', b: '' }),
        save,
        delayMs: 500,
      });

      edit.setField('a', 'a1');
      vi.advanceTimersByTime(500);
      expect(save).toHaveBeenLastCalledWith({ a: 'a1' });

      // Fresh burst: only b changed since the last save.
      edit.setField('b', 'b1');
      vi.advanceTimersByTime(500);
      expect(save).toHaveBeenCalledTimes(2);
      expect(save).toHaveBeenLastCalledWith({ b: 'b1' });
      dispose();
    });
  });

  it('flush fires the pending patch now (one save with all pending fields)', () => {
    const save = vi.fn();
    createRoot(dispose => {
      const edit = createDebouncedEdit<{ a: string; b: string }>({
        id: () => 'x',
        initial: () => ({ a: '', b: '' }),
        save,
      });
      edit.setField('a', 'a1');
      edit.setField('b', 'b1');
      edit.flush();
      expect(save).toHaveBeenCalledTimes(1);
      expect(save).toHaveBeenCalledWith({ a: 'a1', b: 'b1' });
      dispose();
    });
  });

  it('cancel drops the pending patch without firing it', () => {
    const save = vi.fn();
    createRoot(dispose => {
      const edit = createDebouncedEdit<{ a: string; b: string }>({
        id: () => 'x',
        initial: () => ({ a: '', b: '' }),
        save,
      });
      edit.setField('a', 'a1');
      edit.setField('b', 'b1');
      edit.cancel();
      vi.advanceTimersByTime(1000);
      expect(save).not.toHaveBeenCalled();
      dispose();
    });
  });

  // NOTE: flush-on-dispose (onCleanup(flush)) can't be asserted here —
  // vitest's node env resolves solid-js to its SERVER build, where onCleanup is
  // a no-op (SSR runs no cleanups). Same limit as the re-seed above. That
  // durability path — typing then clicking a nav link within the debounce
  // window still saves — is verified in the running app.

  it('does not schedule a save when the value is unchanged', () => {
    const save = vi.fn();
    createRoot(dispose => {
      const edit = createDebouncedEdit<{ description: string }>({
        id: () => 'a',
        initial: () => ({ description: 'same' }),
        save,
      });
      edit.setField('description', 'same'); // equal to current store value
      vi.advanceTimersByTime(1000);
      expect(save).not.toHaveBeenCalled();
      dispose();
    });
  });
});
