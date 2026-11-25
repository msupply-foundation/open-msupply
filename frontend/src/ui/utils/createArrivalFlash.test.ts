import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, createSignal, type Accessor } from 'solid-js';
import {
  ARRIVAL_DELAY_MS,
  ARRIVAL_EXPIRY_MS,
  createArrivalFlash,
  flashOnArrival,
} from './createArrivalFlash';
import { FLASH_MS } from './createFlash';

// A create's message waits for its record's screen, shows there a beat after
// the record has loaded (so the footer's live region is in the page first),
// clears itself, and is never shown again: not for another record, not on a
// second visit. Effects run once the root returns, so each screen is mounted
// in a root and read from outside it.

const mount = (loadedId: Accessor<string | undefined>) =>
  createRoot(dispose => ({ message: createArrivalFlash(loadedId), dispose }));

describe('createArrivalFlash', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('flashes the message left for the record a beat after it has loaded', () => {
    flashOnArrival('p1', 'Patient created');
    const [id, setId] = createSignal<string>();
    // An accessor handed on as one: the effect inside tracks it.
    // eslint-disable-next-line solid/reactivity
    const screen = mount(id);
    setId('p1');
    // Not with the record: the footer's live region lands first.
    expect(screen.message()).toBeUndefined();
    vi.advanceTimersByTime(ARRIVAL_DELAY_MS);
    expect(screen.message()).toBe('Patient created');
    vi.advanceTimersByTime(FLASH_MS);
    expect(screen.message()).toBeUndefined();
    screen.dispose();
  });

  it('shows it only once', () => {
    flashOnArrival('p1', 'Patient created');
    mount(() => 'p1').dispose();
    const again = mount(() => 'p1');
    vi.advanceTimersByTime(ARRIVAL_DELAY_MS);
    expect(again.message()).toBeUndefined();
    again.dispose();
  });

  it('shows it once when the record loads again during the delay', () => {
    flashOnArrival('p1', 'Patient created');
    // A refetch publishes a new record object with the same id.
    const [record, setRecord] = createSignal<{ id: string }>();
    // eslint-disable-next-line solid/reactivity
    const screen = mount(() => record()?.id);
    setRecord({ id: 'p1' });
    vi.advanceTimersByTime(ARRIVAL_DELAY_MS / 2);
    setRecord({ id: 'p1' });
    vi.advanceTimersByTime(ARRIVAL_DELAY_MS);
    expect(screen.message()).toBe('Patient created');
    vi.advanceTimersByTime(FLASH_MS);
    expect(screen.message()).toBeUndefined();
    vi.advanceTimersByTime(ARRIVAL_DELAY_MS);
    expect(screen.message()).toBeUndefined();
    screen.dispose();
  });

  it('forgets a message its record never came to take', () => {
    flashOnArrival('p1', 'Patient created');
    vi.advanceTimersByTime(ARRIVAL_EXPIRY_MS + 1);
    const late = mount(() => 'p1');
    vi.advanceTimersByTime(ARRIVAL_DELAY_MS);
    expect(late.message()).toBeUndefined();
    late.dispose();
  });

  it('shows nothing once the screen has gone', () => {
    flashOnArrival('p1', 'Patient created');
    const screen = mount(() => 'p1');
    screen.dispose();
    vi.advanceTimersByTime(ARRIVAL_DELAY_MS);
    expect(screen.message()).toBeUndefined();
  });

  it('leaves another record’s screen alone', () => {
    flashOnArrival('p1', 'Patient created');
    const other = mount(() => 'p2');
    vi.advanceTimersByTime(ARRIVAL_DELAY_MS);
    expect(other.message()).toBeUndefined();
    other.dispose();
    // Still waiting for its own record.
    const own = mount(() => 'p1');
    vi.advanceTimersByTime(ARRIVAL_DELAY_MS);
    expect(own.message()).toBe('Patient created');
    own.dispose();
  });
});
