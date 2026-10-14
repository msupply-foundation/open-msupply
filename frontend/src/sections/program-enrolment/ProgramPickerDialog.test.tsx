import { createRoot } from 'solid-js';
import { afterEach, describe, expect, it, vi } from 'vitest';

/*
 * The program picker (spec/program-enrolment ui-surface S2, rules § enrolling
 * a patient; cases OMS-REG-PAT-04 `.1`–`.7`). The library components are
 * stand-ins that keep their props, so the test reads the options, the notice
 * and the buttons as rendered and acts through their callbacks. Which
 * programs reach the picker (the user's view permission, `.3`) is the
 * server's narrowing of the registry read, not the picker's.
 */

interface Option {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}
interface ButtonProps {
  disabled?: boolean;
  onClick: () => void;
  'data-testid'?: string;
  confirms?: string;
}

const shown: {
  title?: string;
  options?: () => Option[];
  onChange?: (value: string) => void;
  notice?: unknown;
  buttons: ButtonProps[];
} = { buttons: [] };

vi.mock('@/ui/elements/feedback/Dialog', () => ({
  Dialog: (p: { title: string; children: unknown; actions: unknown }) => {
    shown.title = p.title;
    return [p.children, p.actions];
  },
}));
vi.mock('@/ui/elements/inputs/RadioGroup', () => ({
  RadioGroup: (p: { options: Option[]; onChange: (v: string) => void }) => {
    shown.options = () => p.options;
    shown.onChange = p.onChange;
    return 'radios';
  },
}));
vi.mock('@/ui/elements/feedback/Alert', () => ({
  Alert: (p: { children: unknown }) => {
    shown.notice = p.children;
    return 'notice';
  },
}));
vi.mock('@/ui/elements/buttons/Button', () => ({
  Button: (p: ButtonProps) => {
    shown.buttons.push(p);
    return 'button';
  },
}));
vi.mock('@/ui/icons', () => ({ XCircleIcon: () => 'icon' }));
vi.mock('@/intl', () => ({ t: (key: string) => key }));

import { ProgramPickerDialog } from './ProgramPickerDialog';
import type { FormRegistryFragment } from '@/domain/documentForm/documentForm.generated';

const entry = (documentType: string, name: string | null) =>
  ({
    __typename: 'DocumentRegistryNode',
    id: `reg-${documentType}`,
    documentType,
    category: 'PROGRAM_ENROLMENT',
    contextId: documentType,
    name,
    formSchemaId: 'schema',
    jsonSchema: {},
  }) as FormRegistryFragment;

const TB = entry('TBProgram', 'TB Program');
const HIV = entry('HIVCareProgram', 'HIV Care & Treatment');
const UNNAMED = entry('AnteNatalProgram', null);

let dispose: (() => void) | undefined;
afterEach(() => {
  dispose?.();
  dispose = undefined;
  shown.buttons = [];
  delete shown.options;
  delete shown.notice;
});

const open = (registries: FormRegistryFragment[], enrolled: string[] = []) => {
  const onPick = vi.fn();
  const onClose = vi.fn();
  createRoot(d => {
    dispose = d;
    return ProgramPickerDialog({
      open: true,
      registries,
      enrolledTypes: new Set(enrolled),
      onPick,
      onClose,
    });
  });
  const enrol = () =>
    shown.buttons.find(b => b['data-testid'] === 'program-picker-enrol');
  const cancel = () => shown.buttons.find(b => b.confirms === 'cancel');
  return { onPick, onClose, enrol, cancel };
};

describe('OMS-REG-PAT-04.1 — the picker lists the programs by name, in name order', () => {
  it('orders the options by name, whatever order the server gave', () => {
    open([TB, UNNAMED, HIV]);
    expect(shown.title).toBe('heading.enrol-in-program');
    expect(shown.options?.().map(o => o.label)).toEqual([
      'AnteNatalProgram',
      'HIV Care & Treatment',
      'TB Program',
    ]);
  });

  it('labels a program with no name by its enrolment type', () => {
    open([UNNAMED]);
    expect(shown.options?.()[0].label).toBe('AnteNatalProgram');
  });
});

describe('OMS-REG-PAT-04.2 — a program the patient is in is listed, disabled and marked', () => {
  it('stays listed, disabled, and carries Enrolled', () => {
    open([TB, HIV], ['HIVCareProgram']);
    const hiv = shown.options?.().find(o => o.label === 'HIV Care & Treatment');
    expect(hiv).toMatchObject({
      disabled: true,
      description: 'label.enrolled',
    });
  });

  it('leaves the other programs choosable and unmarked', () => {
    open([TB, HIV], ['HIVCareProgram']);
    const tb = shown.options?.().find(o => o.label === 'TB Program');
    expect(tb).toMatchObject({ disabled: false, description: undefined });
  });
});

describe('OMS-REG-PAT-04.4 — with no program to offer', () => {
  it('shows the no-programs-configured notice and no options', () => {
    open([]);
    expect(shown.notice).toBe('messages.no-programs-configured');
    expect(shown.options).toBeUndefined();
  });
});

describe('OMS-REG-PAT-04.5 / .6 / .7 — choosing, enrolling and cancelling', () => {
  it('Enrol stays disabled until a program is chosen (.5)', () => {
    const { enrol } = open([TB, HIV]);
    expect(enrol()?.disabled).toBe(true);
    shown.onChange?.(HIV.id);
    expect(enrol()?.disabled).toBe(false);
  });

  it('Cancel closes the picker and opens no enrolment (.6)', () => {
    const { cancel, onClose, onPick } = open([TB, HIV]);
    cancel()?.onClick();
    expect(onClose).toHaveBeenCalledOnce();
    expect(onPick).not.toHaveBeenCalled();
  });

  it('Enrol opens a new enrolment in the chosen program (.7)', () => {
    const { enrol, onPick } = open([TB, HIV]);
    shown.onChange?.(TB.id);
    enrol()?.onClick();
    expect(onPick).toHaveBeenCalledWith(TB);
  });
});
