import { children, createRoot, createSignal, type JSX } from 'solid-js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ChoosePatientProps } from './ChoosePatient';
import type { PickerFieldProps } from '../../../ui/elements/selectors/PickerField';

/*
 * A record's patient (spec/patients S4; cases OMS-REG-DIS-01 `.54`, `.79`,
 * `.80`): a picker box showing the name that opens the patient search, never a
 * type-ahead. The picker box, the search and the pencil are stand-ins that
 * keep the props
 * they were given, so the test reads what the field shows and acts through
 * the same callbacks, without a DOM.
 */

const shown: {
  picker?: PickerFieldProps;
  /** The picker's end action, resolved as the picker would insert it. */
  endAction?: () => JSX.Element;
  choose?: ChoosePatientProps;
  pencil?: { label: string; onClick: () => void };
} = {};

vi.mock('../../../ui/elements/selectors/PickerField', () => ({
  PickerField: (p: PickerFieldProps) => {
    shown.picker = p;
    shown.endAction = children(() => p.endAction);
    return null;
  },
}));
vi.mock('./ChoosePatient', () => ({
  ChoosePatient: (p: ChoosePatientProps) => {
    shown.choose = p;
    return null;
  },
}));
vi.mock('../../../ui/elements/buttons/IconButton', () => ({
  IconButton: (p: { label: string; onClick: () => void }) => {
    shown.pencil = p;
    return 'pencil';
  },
}));
vi.mock('../../../ui/icons', () => ({ EditIcon: () => 'edit-icon' }));
vi.mock('../../../intl', () => ({ t: (key: string) => key }));

import { PatientField, type PatientFieldProps } from './PatientField';

let dispose: (() => void) | undefined;
afterEach(() => {
  dispose?.();
  dispose = undefined;
  delete shown.picker;
  delete shown.endAction;
  delete shown.choose;
  delete shown.pencil;
});

type Patient = { id: string; name: string };
const ANN: Patient = { id: 'p-ann', name: 'Brown, Ann' };
const BEN: Patient = { id: 'p-ben', name: 'Cole, Ben' };

const mount = (
  options: {
    patient?: Patient;
    chooseOnOpen?: boolean;
    onEditPatient?: PatientFieldProps['onEditPatient'];
    disabled?: boolean;
  } = {}
) => {
  const [patient, setPatient] = createSignal(options.patient);
  const [chooseOnOpen, setChooseOnOpen] = createSignal(options.chooseOnOpen);
  const onChange = vi.fn();
  createRoot(d => {
    dispose = d;
    return (
      <PatientField
        storeId="store"
        patient={patient()}
        chooseOnOpen={chooseOnOpen()}
        disabled={options.disabled}
        onEditPatient={options.onEditPatient}
        onChange={onChange}
      />
    );
  });
  const searchOpen = () => shown.choose?.open;
  return { setPatient, setChooseOnOpen, onChange, searchOpen };
};

describe('OMS-REG-DIS-01.79 — the box shows the record’s patient', () => {
  it('shows the patient’s name, with the search placeholder for none', () => {
    const { setPatient } = mount();
    expect(shown.picker?.value).toBeUndefined();
    expect(shown.picker?.placeholder).toBe('placeholder.search-patient');
    setPatient(ANN);
    expect(shown.picker?.value).toBe('Brown, Ann');
  });

  it('passes the field’s disabled state to the box', () => {
    mount({ disabled: true });
    expect(shown.picker?.disabled).toBe(true);
  });
});

describe('OMS-REG-DIS-01.54 — the box opens the patient search, not a type-ahead', () => {
  it('opens the search when the box is clicked', () => {
    const { searchOpen } = mount({ patient: ANN });
    expect(searchOpen()).toBe(false);
    shown.picker?.onOpen();
    expect(searchOpen()).toBe(true);
  });

  it('titles the search Change, from the current patient, when there is one', () => {
    mount({ patient: ANN });
    expect(shown.choose?.title).toBe('label.change');
    expect(shown.choose?.changingFrom).toBe('Brown, Ann');
    expect(shown.choose?.showRecent).toBe(true);
  });

  it('closes the search when it is closed', () => {
    const { searchOpen } = mount();
    shown.picker?.onOpen();
    shown.choose?.onClose();
    expect(searchOpen()).toBe(false);
  });
});

describe('PatientField — opening with its dialog (chooseOnOpen)', () => {
  it('opens the search when chooseOnOpen turns true with no patient yet', () => {
    const { setChooseOnOpen, searchOpen } = mount({ chooseOnOpen: false });
    expect(searchOpen()).toBe(false);
    setChooseOnOpen(true);
    expect(searchOpen()).toBe(true);
  });

  it('opens it straight away when chooseOnOpen starts true', () => {
    const { searchOpen } = mount({ chooseOnOpen: true });
    expect(searchOpen()).toBe(true);
  });

  it('leaves it closed when there is already a patient', () => {
    const { setChooseOnOpen, searchOpen } = mount({
      patient: ANN,
      chooseOnOpen: false,
    });
    setChooseOnOpen(true);
    expect(searchOpen()).toBe(false);
  });

  it('closes the search when chooseOnOpen turns false', () => {
    const { setChooseOnOpen, searchOpen } = mount({ chooseOnOpen: true });
    setChooseOnOpen(false);
    expect(searchOpen()).toBe(false);
  });

  it('does not reopen when a patient is chosen while it stays true', () => {
    const { setPatient, searchOpen } = mount({ chooseOnOpen: true });
    shown.choose?.onChosen?.(ANN);
    setPatient(ANN);
    expect(searchOpen()).toBe(false);
  });
});

describe('OMS-REG-DIS-01.79 — choosing a patient sets the field; the same one changes nothing', () => {
  it('reports another patient chosen, and closes the search', () => {
    const { onChange, searchOpen } = mount({ patient: ANN });
    shown.picker?.onOpen();
    shown.choose?.onChosen?.(BEN);
    expect(onChange).toHaveBeenCalledWith(BEN);
    expect(searchOpen()).toBe(false);
  });

  it('reports nothing when the same patient is chosen again', () => {
    const { onChange, searchOpen } = mount({ patient: ANN });
    shown.picker?.onOpen();
    shown.choose?.onChosen?.({ ...ANN });
    expect(onChange).not.toHaveBeenCalled();
    expect(searchOpen()).toBe(false);
  });

  it('reports the first patient chosen for a record with none', () => {
    const { onChange } = mount();
    shown.choose?.onChosen?.(ANN);
    expect(onChange).toHaveBeenCalledWith(ANN);
  });
});

describe('OMS-REG-DIS-01.80 — the pencil edits the patient', () => {
  it('shows a pencil that edits the current patient', () => {
    const onEditPatient = vi.fn();
    mount({ patient: ANN, onEditPatient });
    expect(shown.endAction?.()).toBe('pencil');
    shown.pencil?.onClick();
    expect(onEditPatient).toHaveBeenCalledWith('p-ann');
  });

  it('stays usable while the field is disabled', () => {
    const onEditPatient = vi.fn();
    mount({ patient: ANN, onEditPatient, disabled: true });
    expect(shown.endAction?.()).toBe('pencil');
  });

  it('shows no pencil with no patient, or no edit action', () => {
    mount({ onEditPatient: vi.fn() });
    expect(shown.endAction?.()).toBeFalsy();
    dispose?.();
    mount({ patient: ANN });
    expect(shown.endAction?.()).toBeFalsy();
  });
});
