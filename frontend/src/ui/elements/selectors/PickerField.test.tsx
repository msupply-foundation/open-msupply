import { createRoot, createSignal, Show } from 'solid-js';
import { afterEach, describe, expect, it, vi } from 'vitest';

/*
 * The picker field (spec/patients S4: a record's patient is picked in the
 * patient search, never typed): a field-shaped button showing the value, which
 * opens the owner's dialog. The suite runs without a DOM
 * (vitest.workspace.ts), and this component is nothing but elements, so it
 * renders into ui/utils/fakeDom, imported first.
 */
import '../../utils/fakeDom';
import type { FakeElement } from '../../utils/fakeDom';

vi.mock('../../icons', () => ({ SearchIcon: () => '' }));

import { PickerField, type PickerFieldProps } from './PickerField';

let dispose: (() => void) | undefined;
afterEach(() => {
  dispose?.();
  dispose = undefined;
});

const mount = (props: Partial<PickerFieldProps> = {}) => {
  const onOpen = vi.fn();
  const [value, setValue] = createSignal(props.value);
  const field = createRoot(d => {
    dispose = d;
    return (
      <PickerField
        label="Patient"
        placeholder="Search for a patient"
        onOpen={onOpen}
        {...props}
        value={value()}
      />
    );
  }) as unknown as FakeElement;
  const button = () => {
    const found = field.all().find(el => el.tagName === 'button');
    if (!found) throw new Error('no button');
    return found;
  };
  const click = () => {
    // What Solid's delegated listener does for a click on the button: run
    // its handler unless the button is disabled.
    const b = button();
    if (b.disabled) return;
    (b.$$click as (e: unknown) => void)({ currentTarget: b, target: b });
  };
  const valueText = () => {
    const span = button()
      .all()
      .find(el => el.tagName === 'span');
    return span;
  };
  return { field, button, click, valueText, onOpen, setValue };
};

describe('OMS-REG-DIS-01.79 — the box shows the chosen value', () => {
  it('shows the value when there is one', () => {
    const { valueText } = mount({ value: 'Brown, Ann' });
    expect(valueText()?.textContent).toBe('Brown, Ann');
    expect(valueText()?.hasAttribute('data-placeholder-shown')).toBe(false);
  });

  it('shows the placeholder, marked as such, while there is none', () => {
    const { valueText, setValue } = mount();
    expect(valueText()?.textContent).toBe('Search for a patient');
    expect(valueText()?.hasAttribute('data-placeholder-shown')).toBe(true);
    setValue('Brown, Ann');
    expect(valueText()?.textContent).toBe('Brown, Ann');
    expect(valueText()?.hasAttribute('data-placeholder-shown')).toBe(false);
  });
});

describe('OMS-REG-DIS-01.79 — clicking opens the owner’s dialog', () => {
  it('calls onOpen when the box is clicked', () => {
    const { click, onOpen, button } = mount();
    expect(button().getAttribute('aria-haspopup')).toBe('dialog');
    click();
    expect(onOpen).toHaveBeenCalledOnce();
  });

  it('does not open while disabled', () => {
    const { click, onOpen, button } = mount({ disabled: true });
    expect(button().disabled).toBe(true);
    click();
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('carries the test id on the button', () => {
    const { button } = mount({ testId: 'patient-field' });
    expect(button().getAttribute('data-testid')).toBe('patient-field');
  });
});

describe('PickerField — its label', () => {
  it('shows the label and names the button by it', () => {
    const { field, button } = mount();
    const label = field
      .all()
      .find(el => el.tagName === 'span' && el.textContent === 'Patient');
    expect(label).toBeDefined();
    expect(button().getAttribute('aria-labelledby')).toBe(
      label?.getAttribute('id')
    );
    expect(button().hasAttribute('aria-label')).toBe(false);
  });

  it('names the button with aria-label instead when the label is hidden', () => {
    const { field, button } = mount({ hideLabel: true });
    expect(button().getAttribute('aria-label')).toBe('Patient');
    expect(button().hasAttribute('aria-labelledby')).toBe(false);
    expect(
      field.all().some(el => el !== button() && el.textContent === 'Patient')
    ).toBe(false);
  });

  it('marks a required field, on the label and the button', () => {
    const { field, button } = mount({ required: true });
    const marker = field
      .all()
      .find(el => el.tagName === 'span' && el.textContent === '*');
    expect(marker?.getAttribute('aria-hidden')).toBe('true');
    expect(button().getAttribute('aria-required')).toBe('true');
  });

  it('has no required marker otherwise', () => {
    const { field, button } = mount();
    expect(field.all().some(el => el.textContent === '*')).toBe(false);
    expect(button().hasAttribute('aria-required')).toBe(false);
  });
});

describe('OMS-REG-DIS-01.80 — the end action (the patient field’s pencil)', () => {
  it('renders the end action beside the button, outside it', () => {
    const { field, button } = mount({ endAction: 'pencil' });
    expect(field.textContent).toContain('pencil');
    expect(button().textContent).not.toContain('pencil');
  });

  it('renders no end action slot when there is none', () => {
    const { field, button } = mount();
    const spans = field
      .all()
      .filter(el => el.tagName === 'span' && !button().all().includes(el));
    // Only the label.
    expect(spans.map(s => s.textContent)).toEqual(['Patient']);
  });

  // The patient field passes its pencil inside its own <Show>.
  it('renders no end action slot when the end action renders nothing', () => {
    const { field, button } = mount({
      get endAction() {
        return <Show when={false}>pencil</Show>;
      },
    });
    const spans = field
      .all()
      .filter(el => el.tagName === 'span' && !button().all().includes(el));
    expect(spans.map(s => s.textContent)).toEqual(['Patient']);
  });
});
