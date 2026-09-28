import { describe, expect, it } from 'vitest';
import { createRoot, createSignal } from 'solid-js';
import { createSaveOnToggle } from './saveOnToggle';

// A save the test settles by hand, so the in-flight state can be observed.
const deferredSave = () => {
  let settle!: () => void;
  const calls: boolean[] = [];
  const save = (next: boolean) => {
    calls.push(next);
    return new Promise<void>(resolve => {
      settle = resolve;
    });
  };
  return { save, calls, settle: () => settle() };
};

const setup = (initial: boolean) =>
  createRoot(dispose => {
    const [stored, setStored] = createSignal(initial);
    const deferred = deferredSave();
    const toggleState = createSaveOnToggle(stored, deferred.save);
    return { ...toggleState, ...deferred, stored, setStored, dispose };
  });

// The settings pause switches save on flip, and a failed save must not leave
// one showing a state that was never stored.
describe('createSaveOnToggle', () => {
  it('shows the stored value until flipped', () => {
    const s = setup(true);
    expect(s.checked()).toBe(true);
    expect(s.busy()).toBe(false);
    s.dispose();
  });

  it('holds the flip while the save is in flight', () => {
    const s = setup(false);
    void s.toggle(true);
    expect(s.checked()).toBe(true);
    expect(s.busy()).toBe(true);
    expect(s.calls).toEqual([true]);
    s.dispose();
  });

  it('keeps the new value once the save stores it', async () => {
    const s = setup(false);
    const done = s.toggle(true);
    s.setStored(true);
    s.settle();
    await done;
    expect(s.checked()).toBe(true);
    expect(s.busy()).toBe(false);
    s.dispose();
  });

  it('reverts to the stored value when the save fails', async () => {
    const s = setup(false);
    const done = s.toggle(true);
    // A failed save leaves `stored` as it was
    s.settle();
    await done;
    expect(s.checked()).toBe(false);
    expect(s.busy()).toBe(false);
    s.dispose();
  });

  it('ignores a second flip while a save is in flight', async () => {
    const s = setup(false);
    const done = s.toggle(true);
    void s.toggle(false);
    expect(s.calls).toEqual([true]);
    s.setStored(true);
    s.settle();
    await done;
    expect(s.checked()).toBe(true);
    s.dispose();
  });
});
