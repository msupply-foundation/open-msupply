import { batch, createRoot, createSignal } from 'solid-js';
import { describe, expect, it } from 'vitest';
import { createStatusArrival } from './statusArrival';

/*
 * The "just arrived" half of the status strip's arrival motion (issue #607):
 * StatusIndicator stamps the returned stage as data-arrived and clears it on
 * animationend. A .tsx suite so it runs in the `solid` vitest project, whose
 * browser resolve conditions make signals track (vitest.workspace.ts).
 */
const setup = (initial: number) =>
  createRoot(dispose => {
    const [current, setCurrent] = createSignal(initial);
    const arrival = createStatusArrival(current);
    return { arrival, setCurrent, dispose };
  });

describe('createStatusArrival', () => {
  it('plays nothing for the status the record opened at', () => {
    const { arrival, dispose } = setup(2);
    expect(arrival.arrived()).toBeUndefined();
    dispose();
  });

  it('marks the stage a forward move lands on', () => {
    const { arrival, setCurrent, dispose } = setup(0);
    setCurrent(1);
    expect(arrival.arrived()).toBe(1);
    dispose();
  });

  it('marks the landing stage of a move that skips stages', () => {
    const { arrival, setCurrent, dispose } = setup(0);
    setCurrent(3);
    expect(arrival.arrived()).toBe(3);
    dispose();
  });

  it('plays once: cleared, it stays cleared until the next move', () => {
    const { arrival, setCurrent, dispose } = setup(0);
    setCurrent(1);
    arrival.clear();
    expect(arrival.arrived()).toBeUndefined();
    // The same status again (a re-render, a refetch that returns the same
    // node) is not a move.
    setCurrent(1);
    expect(arrival.arrived()).toBeUndefined();
    // The next forward move plays again.
    setCurrent(2);
    expect(arrival.arrived()).toBe(2);
    dispose();
  });

  it('keeps a pending arrival when current re-evaluates to the same stage', () => {
    // A prop computed from the record re-runs when the view replaces the
    // record (a refetch straight after the save) — modelled by a signal that
    // notifies on every write, equal or not.
    const { arrival, setCurrent, dispose } = createRoot(dispose => {
      const [current, setCurrent] = createSignal(0, { equals: false });
      return { arrival: createStatusArrival(current), setCurrent, dispose };
    });
    setCurrent(1);
    setCurrent(1);
    expect(arrival.arrived()).toBe(1);
    dispose();
  });

  it('treats another record as a fresh open, not a move', () => {
    // The footer stays mounted while the route swaps records (duplicate a
    // Verified shipment, then go Back to it from the New copy).
    const { arrival, setCurrent, setRecord, dispose } = createRoot(dispose => {
      const [current, setCurrent] = createSignal(0);
      const [record, setRecord] = createSignal('copy');
      return {
        arrival: createStatusArrival(current, record),
        setCurrent,
        setRecord,
        dispose,
      };
    });
    batch(() => {
      setRecord('original');
      setCurrent(3);
    });
    expect(arrival.arrived()).toBeUndefined();
    // A real move on the record now showing still plays.
    setCurrent(4);
    expect(arrival.arrived()).toBe(4);
    dispose();
  });

  it('does not play on a step back, and drops a pending arrival', () => {
    const { arrival, setCurrent, dispose } = setup(1);
    setCurrent(2);
    expect(arrival.arrived()).toBe(2);
    setCurrent(1);
    expect(arrival.arrived()).toBeUndefined();
    dispose();
  });
});
