import { createRoot, createSignal } from 'solid-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/*
 * No DOM here: fakeDom is imported first, so it's installed before Solid
 * registers its delegated listeners. The calendar and time segments are
 * stubbed; the time stub records the value it's given.
 */
import '../../utils/fakeDom';
import {
  fakeDocument,
  fire,
  press,
  type FakeElement,
} from '../../utils/fakeDom';

const time = vi.hoisted(() => ({
  props: undefined as
    { value?: { hour?: number; minute?: number } } | undefined,
}));

vi.mock('../../icons', () => ({
  AlertTriangleIcon: () => '',
  CalendarIcon: () => '',
  CloseIcon: () => '',
}));
vi.mock('../feedback/Popover', () => ({ Popover: () => '' }));
vi.mock('./DatePickerPanel', () => ({ DatePickerPanel: () => '' }));
vi.mock('@kobalte/core/time-field', () => ({
  TimeField: Object.assign(
    (p: { value?: { hour?: number; minute?: number } }) => {
      time.props = p;
      return '';
    },
    { Input: () => '', Segment: () => '' }
  ),
}));

import { DateField, type DateFieldProps } from './DateField';
import { DateTimeField, type DateTimeFieldProps } from './DateTimeField';

let dispose: (() => void) | undefined;
beforeEach(() => {
  fakeDocument.activeElement = null;
  time.props = undefined;
});
afterEach(() => {
  dispose?.();
  dispose = undefined;
});

const parts = (root: FakeElement, testId: string) => ({
  input: () => {
    const found = root
      .all()
      .find(el => el.getAttribute('data-testid') === testId);
    if (!found) throw new Error(`no ${testId}`);
    return found;
  },
  clear: () =>
    root.all().find(el => el.getAttribute('data-testid') === `${testId}-clear`),
});

/**
 * The parent echoes each change back unless `echo` is false. `refuse(message)`
 * sets `error`, as a parent does when a save fails.
 */
const mountDate = (
  props: Partial<DateFieldProps> = {},
  { echo = true }: { echo?: boolean } = {}
) => {
  const onChange = vi.fn();
  const [value, setValue] = createSignal<string | null | undefined>(
    'value' in props ? props.value : '2027-03-01'
  );
  const [error, setError] = createSignal<string>();
  const root = createRoot(d => {
    dispose = d;
    return (
      <DateField
        label="Date of birth"
        testId="dob"
        {...props}
        value={value()}
        error={error()}
        onChange={v => {
          onChange(v);
          if (echo) setValue(v);
        }}
      />
    );
  }) as unknown as FakeElement;
  return { ...parts(root, 'dob'), onChange, refuse: setError };
};

const mountDateTime = (
  props: Partial<DateTimeFieldProps> = {},
  { echo = true }: { echo?: boolean } = {}
) => {
  const onChange = vi.fn();
  const [value, setValue] = createSignal<string | null | undefined>(
    '2026-07-17T08:30:00.000Z'
  );
  const [error, setError] = createSignal<string>();
  const root = createRoot(d => {
    dispose = d;
    return (
      <DateTimeField
        label="To date/time"
        testId="to"
        {...props}
        value={value()}
        error={error()}
        onChange={v => {
          onChange(v);
          if (echo) setValue(v);
        }}
      />
    );
  }) as unknown as FakeElement;
  return { ...parts(root, 'to'), onChange, refuse: setError };
};

/** Type into the field without entering it. */
const type = (input: FakeElement, text: string) => {
  input.focus();
  input.value = text;
  fire(input, 'input');
};

describe('OMS-REG-DIS-02.65 — a date field clears with a button', () => {
  it('clicking ✕ sends null once, empties the field and keeps focus in it', () => {
    const { input, clear, onChange } = mountDate();
    expect(input().value).toBe('01/03/2027');
    // No catalog loads here, so the key shows.
    expect(clear()?.getAttribute('aria-label')).toBe('label.clear-field');

    press(clear()!);

    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledWith(null);
    expect(input().value).toBe('');
    expect(fakeDocument.activeElement).toBe(input());
    expect(clear()).toBeUndefined();
  });

  it('a required field has no ✕', () => {
    const { clear } = mountDate({ required: true });
    expect(clear()).toBeUndefined();
  });

  it('a field that can be moved but not emptied has no ✕ and is not required', () => {
    const { input, clear, onChange } = mountDate({ clearable: false });
    expect(clear()).toBeUndefined();
    expect(input().getAttribute('required')).toBeNull();
    type(input(), '');
    input().blur();
    expect(input().value).toBe('01/03/2027');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('a disabled field has no ✕', () => {
    const { clear } = mountDate({ disabled: true });
    expect(clear()).toBeUndefined();
  });

  it('an empty field has no ✕ until something is typed', () => {
    const { input, clear } = mountDate({ value: null });
    expect(clear()).toBeUndefined();
    type(input(), '0');
    expect(clear()).toBeDefined();
  });
});

describe('OMS-FUN-PO-04.45 — a clear is one change', () => {
  it('leaving the field after a clear sends nothing more', () => {
    const { input, clear, onChange } = mountDate();
    press(clear()!);
    input().blur();
    expect(onChange).toHaveBeenCalledOnce();
  });

  it('a day typed but not entered is dropped by the clear, not sent first', () => {
    const { input, clear, onChange } = mountDate();
    type(input(), '15/04/2027');
    press(clear()!);
    input().blur();
    expect(onChange.mock.calls).toEqual([[null]]);
  });

  it('a parent that does not echo the value still hears the clear', () => {
    const { input, clear, onChange } = mountDate(
      { value: null },
      { echo: false }
    );
    type(input(), '15/04/2027');
    input().blur();
    press(clear()!);
    expect(onChange.mock.calls).toEqual([['2027-04-15'], [null]]);
  });

  it('a day typed into an empty field, then cleared, sends nothing', () => {
    const { input, clear, onChange } = mountDate({ value: null });
    type(input(), '15/04/2027');
    press(clear()!);
    input().blur();
    expect(input().value).toBe('');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('leaving a field that was not typed in sends nothing', () => {
    const { input, onChange } = mountDate();
    input().focus();
    fire(input(), 'keydown', { key: 'Enter' });
    input().blur();
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('OMS-FUN-PO-04.46 — a refused save can be tried again', () => {
  it('entering the same day again sends it again', () => {
    const { input, onChange } = mountDate({}, { echo: false });
    type(input(), '15/04/2027');
    input().blur();
    type(input(), '15/04/2027');
    input().blur();
    expect(onChange.mock.calls).toEqual([['2027-04-15'], ['2027-04-15']]);
  });

  it('a refused clear puts the date and its ✕ back, and clears again', () => {
    const { input, clear, onChange, refuse } = mountDate({}, { echo: false });
    press(clear()!);
    expect(input().value).toBe('');
    refuse('Not saved');
    expect(input().value).toBe('01/03/2027');
    expect(input().getAttribute('aria-invalid')).toBe('true');
    press(clear()!);
    expect(onChange.mock.calls).toEqual([[null], [null]]);
  });

  it('a refused typed day goes back to the saved one', () => {
    const { input, refuse } = mountDate({}, { echo: false });
    type(input(), '15/04/2027');
    input().blur();
    refuse('Not saved');
    expect(input().value).toBe('01/03/2027');
  });

  it('a date and time: the same date entered again sends again', () => {
    const { input, onChange } = mountDateTime({}, { echo: false });
    type(input(), '20/07/2026');
    input().blur();
    type(input(), '20/07/2026');
    input().blur();
    expect(onChange).toHaveBeenCalledTimes(2);
    expect(onChange.mock.calls[1]).toEqual(onChange.mock.calls[0]);
  });

  it('a date and time: a refused clear puts the date and time back', () => {
    const { input, clear, onChange, refuse } = mountDateTime(
      {},
      { echo: false }
    );
    const shown = input().value;
    press(clear()!);
    refuse('Not saved');
    expect(input().value).toBe(shown);
    expect(time.props?.value?.hour).toBeDefined();
    press(clear()!);
    expect(onChange.mock.calls).toEqual([[null], [null]]);
  });
});

describe('OMS-REG-CAT-04.49 — a date and time clears with a button', () => {
  it('clicking ✕ sends null once and empties the date and the time', () => {
    const { input, clear, onChange } = mountDateTime();
    expect(input().value).not.toBe('');
    expect(time.props?.value?.hour).toBeDefined();

    press(clear()!);

    expect(onChange.mock.calls).toEqual([[null]]);
    expect(input().value).toBe('');
    expect(time.props?.value?.hour).toBeUndefined();
    expect(time.props?.value?.minute).toBeUndefined();
    expect(fakeDocument.activeElement).toBe(input());
  });

  it('a required field has no ✕', () => {
    const { clear } = mountDateTime({ required: true });
    expect(clear()).toBeUndefined();
  });

  it('leaving the field after a clear sends nothing more', () => {
    const { input, clear, onChange } = mountDateTime();
    press(clear()!);
    input().blur();
    expect(onChange).toHaveBeenCalledOnce();
  });
});
