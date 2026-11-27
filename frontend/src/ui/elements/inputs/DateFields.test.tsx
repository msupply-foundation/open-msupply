import { createRoot, createSignal } from 'solid-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/*
 * The date fields' clear button (#2054; ui-standards/inputs.md › constraints,
 * empty, and display). The suite runs without a DOM (vitest.workspace.ts), so
 * the fields render into the stand-in document in ui/utils/fakeDom, imported
 * first: its import installs it before the fields register Solid's delegated
 * listeners. The calendar popover and Kobalte's time segments are stubbed:
 * neither is what these tests are about, and the time stub records what the
 * field hands the segments.
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
 * A DateField whose parent echoes each change back as its value, as every
 * caller in the app does, unless `echo` is false.
 */
const mountDate = (
  props: Partial<DateFieldProps> = {},
  { echo = true }: { echo?: boolean } = {}
) => {
  const onChange = vi.fn();
  const [value, setValue] = createSignal<string | null | undefined>(
    'value' in props ? props.value : '2027-03-01'
  );
  const root = createRoot(d => {
    dispose = d;
    return (
      <DateField
        label="Date of birth"
        testId="dob"
        {...props}
        value={value()}
        onChange={v => {
          onChange(v);
          if (echo) setValue(v);
        }}
      />
    );
  }) as unknown as FakeElement;
  return { ...parts(root, 'dob'), onChange };
};

const mountDateTime = (props: Partial<DateTimeFieldProps> = {}) => {
  const onChange = vi.fn();
  const [value, setValue] = createSignal<string | null | undefined>(
    '2026-07-17T08:30:00.000Z'
  );
  const root = createRoot(d => {
    dispose = d;
    return (
      <DateTimeField
        label="To date/time"
        testId="to"
        {...props}
        value={value()}
        onChange={v => {
          onChange(v);
          setValue(v);
        }}
      />
    );
  }) as unknown as FakeElement;
  return { ...parts(root, 'to'), onChange };
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
    // The key: no catalog loads here (the showcase's browser test reads the
    // English, "Clear Expiry date").
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

  // The guard compares against what the field last sent, not `props.value`:
  // a parent that doesn't echo the change back must still hear the clear.
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
