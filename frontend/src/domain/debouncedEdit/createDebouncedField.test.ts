import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, createSignal } from 'solid-js';
import { createDebouncedField } from './createDebouncedField';

// The debounced field's load-bearing behaviours: the draft shows while the
// field is edited and the server's figure otherwise; a burst of edits sends
// one save; saves go one at a time, so an answer can't land over a newer
// edit (#1591's review — Backspace then 5 showing, and saving, 0); blur saves
// at once. A fake server: `save` records the value and resolves when the test
// answers it, writing the figure the field reads — as a splice or an awaited
// re-read does.

const fakeServer = (initial: number) => {
  const [stored, setStored] = createSignal(initial);
  const sent: number[] = [];
  const answers: (() => void)[] = [];
  const save = (value: number) => {
    sent.push(value);
    return new Promise<void>(resolve =>
      answers.push(() => {
        setStored(value);
        resolve();
      })
    );
  };
  // Answer the oldest unanswered save, and let its continuation run.
  const answer = async () => {
    answers.shift()!();
    await Promise.resolve();
    await Promise.resolve();
  };
  return { stored, setStored, sent, save, answer };
};

describe('createDebouncedField', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('shows the draft at once and collapses a burst of edits into one save', () => {
    const server = fakeServer(10);
    createRoot(dispose => {
      const field = createDebouncedField({
        value: server.stored,
        save: server.save,
        delayMs: 500,
      });
      field.onFocus();
      field.set(1);
      field.set(12);
      expect(field.value()).toBe(12);
      expect(server.sent).toEqual([]);
      vi.advanceTimersByTime(500);
      expect(server.sent).toEqual([12]);
      dispose();
    });
  });

  it('holds the draft while focused, even when the answer to an earlier save lands', async () => {
    const server = fakeServer(10);
    await createRoot(async dispose => {
      const field = createDebouncedField({
        value: server.stored,
        save: server.save,
        delayMs: 500,
      });
      field.onFocus();
      field.set(0);
      vi.advanceTimersByTime(500);
      field.set(5);
      await server.answer(); // the 0 is stored…
      expect(server.stored()).toBe(0);
      expect(field.value()).toBe(5); // …and the field still shows the 5 typed
      dispose();
    });
  });

  it('sends one save at a time: an edit made while a save is on its way goes once it is answered', async () => {
    const server = fakeServer(10);
    await createRoot(async dispose => {
      const field = createDebouncedField({
        value: server.stored,
        save: server.save,
        delayMs: 500,
      });
      field.onFocus();
      field.set(0);
      vi.advanceTimersByTime(500);
      field.set(5);
      vi.advanceTimersByTime(500);
      // The 5's debounce has run, but the 0 is still on its way.
      expect(server.sent).toEqual([0]);
      await server.answer();
      expect(server.sent).toEqual([0, 5]);
      await server.answer();
      expect(server.stored()).toBe(5);
      expect(field.value()).toBe(5);
      dispose();
    });
  });

  it('an edit whose debounce is still running when the earlier save is answered waits for it', async () => {
    const server = fakeServer(10);
    await createRoot(async dispose => {
      const field = createDebouncedField({
        value: server.stored,
        save: server.save,
        delayMs: 500,
      });
      field.onFocus();
      field.set(1);
      vi.advanceTimersByTime(500);
      field.set(12);
      await server.answer();
      expect(server.sent).toEqual([1]);
      vi.advanceTimersByTime(500);
      expect(server.sent).toEqual([1, 12]);
      dispose();
    });
  });

  it('blur saves at once, then shows what the server made of it', async () => {
    const server = fakeServer(10);
    await createRoot(async dispose => {
      const field = createDebouncedField({
        value: server.stored,
        // The server converts the figure (a discount amount via a percentage).
        save: async (value: number) => {
          await server.save(value);
          server.setStored(value - 0.01);
        },
        delayMs: 500,
      });
      field.onFocus();
      field.set(12.34);
      field.onBlur();
      expect(server.sent).toEqual([12.34]);
      expect(field.value()).toBe(12.34); // still waiting on the answer
      await server.answer();
      await Promise.resolve();
      expect(field.value()).toBe(12.33);
      dispose();
    });
  });

  it('shows the server figure when nothing is being edited, and follows it', () => {
    const server = fakeServer(10);
    createRoot(dispose => {
      const field = createDebouncedField({
        value: server.stored,
        save: server.save,
      });
      expect(field.value()).toBe(10);
      server.setStored(7);
      expect(field.value()).toBe(7);
      field.onFocus();
      field.onBlur(); // focus and leave without typing: nothing is saved
      expect(server.sent).toEqual([]);
      expect(field.value()).toBe(7);
      dispose();
    });
  });

  it('saves a pending edit on dispose rather than dropping it', () => {
    const server = fakeServer(10);
    createRoot(dispose => {
      const field = createDebouncedField({
        value: server.stored,
        save: server.save,
        delayMs: 500,
      });
      field.onFocus();
      field.set(3);
      dispose();
    });
    expect(server.sent).toEqual([3]);
  });
});
