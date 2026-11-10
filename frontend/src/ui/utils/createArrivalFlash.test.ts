import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, createSignal, type Accessor } from 'solid-js';
import { createArrivalFlash, flashOnArrival } from './createArrivalFlash';
import { FLASH_MS } from './createFlash';

// A create's message waits for its record's screen, shows there once the
// record has loaded, clears itself, and is never shown again: not for another
// record, not on a second visit. Effects run once the root returns, so each
// screen is mounted in a root and read from outside it.

const mount = (loadedId: Accessor<string | undefined>) =>
  createRoot(dispose => ({ message: createArrivalFlash(loadedId), dispose }));

describe('createArrivalFlash', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('flashes the message left for the record once it has loaded', () => {
    flashOnArrival('p1', 'Patient created');
    const [id, setId] = createSignal<string>();
    // An accessor handed on as one: the effect inside tracks it.
    // eslint-disable-next-line solid/reactivity
    const screen = mount(id);
    expect(screen.message()).toBeUndefined();
    setId('p1');
    expect(screen.message()).toBe('Patient created');
    vi.advanceTimersByTime(FLASH_MS);
    expect(screen.message()).toBeUndefined();
    screen.dispose();
  });

  it('shows it only once', () => {
    flashOnArrival('p1', 'Patient created');
    mount(() => 'p1').dispose();
    const again = mount(() => 'p1');
    expect(again.message()).toBeUndefined();
    again.dispose();
  });

  it('leaves another record’s screen alone', () => {
    flashOnArrival('p1', 'Patient created');
    const other = mount(() => 'p2');
    expect(other.message()).toBeUndefined();
    other.dispose();
    // Still waiting for its own record.
    const own = mount(() => 'p1');
    expect(own.message()).toBe('Patient created');
    own.dispose();
  });
});
