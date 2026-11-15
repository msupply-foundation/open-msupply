import { createRoot } from 'solid-js';
import { describe, expect, it, vi } from 'vitest';

/*
 * The SDK's form library fields are lazy until the library loads, and not
 * after: a field a form shows conditionally must not suspend on each showing,
 * which would swap the whole form for its region's spinner and remount it
 * (kdd/solid-reactivity-pitfalls). The library is mocked with fields that
 * render a string, so this runs in node against the client Solid build.
 */

vi.mock('../domain/documentForm/formLibrary', () => ({
  TextInput: () => 'text input',
  DateInput: () => 'date input',
}));

import { DateInput, TextInput } from './lazyComponents';

// Every accessor read, down to the fixture's string, as the DOM would.
const resolve = (value: unknown): unknown =>
  typeof value === 'function' ? resolve((value as () => unknown)()) : value;

const mount = (field: (props: never) => unknown) => {
  let read!: () => unknown;
  const dispose = createRoot(disposeRoot => {
    const rendered = field({} as never);
    read = () => resolve(rendered);
    return disposeRoot;
  });
  return { read, dispose };
};

describe('form library fields', () => {
  it('render at once when mounted after the library has loaded, even with no instance left mounted', async () => {
    // The form's first paint: the library is still loading.
    const first = mount(TextInput);
    expect(first.read()).toBe('');
    await vi.waitFor(() => expect(first.read()).toBe('text input'));
    first.dispose();

    // A field shown later, by a field of the same kind or another, mounts
    // with the real component, with nothing pending to suspend on.
    const again = mount(TextInput);
    expect(again.read()).toBe('text input');
    again.dispose();

    const other = mount(DateInput);
    expect(other.read()).toBe('date input');
    other.dispose();
  });
});
