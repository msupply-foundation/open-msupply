import { createRoot } from 'solid-js';
import { afterEach, describe, expect, it, vi } from 'vitest';

/*
 * The host's enrolment ID field (spec/program-enrolment ui-surface S5, rules §
 * the enrolment ID; cases OMS-REG-PAT-04). The draft and the redraw loop run
 * for real; the library components are stand-ins that keep the props they
 * were given, so the test reads the field as the user would (its value, its
 * error, whether it can be typed in) and acts through the same callbacks.
 * Whether an ID is free is the mocked edge (its own rules: enrolmentId.test).
 */

interface TextProps {
  value: string;
  readOnly: boolean;
  disabled: boolean;
  error: string | undefined;
  onInput: (e: { currentTarget: { value: string } }) => void;
}
interface ButtonProps {
  disabled: boolean;
  onClick: () => void;
}
interface ConfirmProps {
  open: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

const shown: {
  text?: TextProps;
  button?: ButtonProps;
  confirm?: ConfirmProps;
} = {};

vi.mock('../../ui/layout/Form/FormRow', () => ({
  FormRow: (p: { children: unknown }) => p.children,
}));
vi.mock('../../ui/elements/inputs/TextField', () => ({
  TextField: (p: TextProps) => {
    shown.text = p;
    return 'text';
  },
}));
vi.mock('../../ui/elements/buttons/Button', () => ({
  Button: (p: ButtonProps) => {
    shown.button = p;
    return 'button';
  },
}));
vi.mock('../../ui/elements/feedback/ConfirmDialog', () => ({
  ConfirmDialog: (p: ConfirmProps) => {
    shown.confirm = p;
    return 'confirm';
  },
}));
vi.mock('../../intl', () => ({
  t: (key: string, vars?: Record<string, unknown>) =>
    vars ? `${key} ${JSON.stringify(vars)}` : key,
}));
vi.mock('../../store/storeContext', () => ({ currentStoreId: () => 'store' }));

const held = new Set<string>();
// When set, a check waits for it: a slow server.
let slowCheck: Promise<void> | undefined;
vi.mock('./enrolmentId', async importOriginal => ({
  ...(await importOriginal<typeof import('./enrolmentId')>()),
  isEnrolmentIdFree: async (_store: string, id: string) => {
    if (slowCheck) await slowCheck;
    return !held.has(id);
  },
}));

import { createDraft, type DraftController } from './draft';
import { EnrolmentIdField } from './EnrolmentIdField';
import type { ProgramEnrolment } from '../../plugin-sdk/documents';

let dispose: (() => void) | undefined;
afterEach(() => {
  dispose?.();
  dispose = undefined;
  held.clear();
  delete shown.text;
  delete shown.button;
  delete shown.confirm;
});

const counter = () => {
  let n = 0;
  return vi.fn(async () => `GRY-${String(++n).padStart(4, '0')}`);
};

const mount = (options: {
  data: ProgramEnrolment;
  documentName?: string;
  allowTyping?: boolean;
  generate?: () => Promise<string | undefined>;
}): {
  controller: DraftController<ProgramEnrolment>;
  generate: () => Promise<string | undefined>;
} => {
  const generate = options.generate ?? counter();
  const controller = createRoot(d => {
    dispose = d;
    const c = createDraft<ProgramEnrolment>({
      schema: () => undefined,
      validate: () => undefined,
    });
    c.reset(options.data);
    EnrolmentIdField({
      draft: c.draft,
      record: { patientId: 'patient', documentName: options.documentName },
      generate,
      allowTyping: options.allowTyping,
    });
    return c;
  });
  return { controller, generate };
};

const NEW: ProgramEnrolment = { enrolmentDatetime: '2026-10-14T09:00:00Z' };
const type = (value: string) =>
  shown.text?.onInput({ currentTarget: { value } });

describe('OMS-REG-PAT-04.29 — a new enrolment opens with its ID generated', () => {
  it('generates as a new enrolment opens, and shows it', async () => {
    const { controller } = mount({ data: NEW });
    await vi.waitFor(() =>
      expect(controller.draft.get('programEnrolmentId')).toBe('GRY-0001')
    );
    expect(shown.text?.value).toBe('GRY-0001');
  });

  it('the generated ID is not an edit: the enrolment stays unchanged (.16)', async () => {
    const { controller } = mount({ data: NEW });
    await vi.waitFor(() =>
      expect(controller.draft.get('programEnrolmentId')).toBe('GRY-0001')
    );
    expect(controller.isDirty()).toBe(false);
  });

  it('a saved enrolment opens with its own ID, generating nothing', async () => {
    const { generate } = mount({
      data: { ...NEW, programEnrolmentId: 'GRY-0042' },
      documentName: 'p/patient/DemoProgramEnrolment',
    });
    await Promise.resolve();
    expect(generate).not.toHaveBeenCalled();
    expect(shown.text?.value).toBe('GRY-0042');
  });

  it('shows the ID the form seeds after the field has mounted', () => {
    // The form library already loaded, the field mounts in the same pass that
    // seeds the draft: the seed lands before any effect of the field runs.
    createRoot(d => {
      dispose = d;
      const c = createDraft<ProgramEnrolment>({
        schema: () => undefined,
        validate: () => undefined,
      });
      EnrolmentIdField({
        draft: c.draft,
        record: {
          patientId: 'patient',
          documentName: 'p/patient/DemoProgramEnrolment',
        },
        generate: counter(),
      });
      c.reset({ ...NEW, programEnrolmentId: 'GRY-0042' });
    });
    expect(shown.text?.value).toBe('GRY-0042');
  });

  it('a saved enrolment with no ID stays without one until asked', async () => {
    const { generate } = mount({
      data: NEW,
      documentName: 'p/patient/DemoProgramEnrolment',
    });
    await Promise.resolve();
    expect(generate).not.toHaveBeenCalled();
  });
});

describe('OMS-REG-PAT-04.30 / .31 — Generate on a field that holds an ID asks first', () => {
  it('asks before replacing, and declining keeps the ID (.30)', async () => {
    const { controller, generate } = mount({ data: NEW });
    await vi.waitFor(() => expect(shown.text?.value).toBe('GRY-0001'));
    shown.button?.onClick();
    expect(shown.confirm?.open).toBe(true);
    shown.confirm?.onClose();
    expect(shown.confirm?.open).toBe(false);
    expect(generate).toHaveBeenCalledTimes(1);
    expect(controller.draft.get('programEnrolmentId')).toBe('GRY-0001');
  });

  it('confirming replaces it with a newly generated ID, as an edit (.31)', async () => {
    const { controller } = mount({ data: NEW });
    await vi.waitFor(() => expect(shown.text?.value).toBe('GRY-0001'));
    shown.button?.onClick();
    shown.confirm?.onConfirm();
    await vi.waitFor(() =>
      expect(controller.draft.get('programEnrolmentId')).toBe('GRY-0002')
    );
    expect(shown.text?.value).toBe('GRY-0002');
    expect(controller.isDirty()).toBe(true);
  });

  it('an empty field generates at once, without asking', async () => {
    const { controller } = mount({
      data: NEW,
      documentName: 'p/patient/DemoProgramEnrolment',
    });
    shown.button?.onClick();
    expect(shown.confirm?.open).toBe(false);
    await vi.waitFor(() =>
      expect(controller.draft.get('programEnrolmentId')).toBe('GRY-0001')
    );
  });
});

describe('OMS-REG-PAT-04.35 — a generated ID another enrolment holds is skipped', () => {
  it('opens with the next ID no other enrolment holds', async () => {
    held.add('GRY-0001');
    held.add('GRY-0002');
    const { controller } = mount({ data: NEW });
    await vi.waitFor(() =>
      expect(controller.draft.get('programEnrolmentId')).toBe('GRY-0003')
    );
  });
});

describe('OMS-REG-PAT-04.33 / .34 — typing an ID', () => {
  it('where the program allows it, the ID can be typed (.33)', async () => {
    const { controller } = mount({
      data: { ...NEW, programEnrolmentId: 'GRY-0042' },
      documentName: 'p/patient/DemoProgramEnrolment',
      allowTyping: true,
    });
    expect(shown.text?.readOnly).toBe(false);
    type('CARD-77');
    expect(shown.text?.value).toBe('CARD-77');
    await vi.waitFor(() =>
      expect(controller.draft.get('programEnrolmentId')).toBe('CARD-77')
    );
  });

  it('where it does not, the ID is read-only and Generate still works (.34)', () => {
    mount({
      data: { ...NEW, programEnrolmentId: 'GRY-0042' },
      documentName: 'p/patient/DemoProgramEnrolment',
    });
    expect(shown.text?.readOnly).toBe(true);
    expect(shown.button?.disabled).toBe(false);
  });

  it('a check still running when typing resumes never overwrites what is typed', async () => {
    let release: (() => void) | undefined;
    slowCheck = new Promise<void>(r => (release = r));
    const { controller } = mount({
      data: { ...NEW, programEnrolmentId: 'GRY-0042' },
      documentName: 'p/patient/DemoProgramEnrolment',
      allowTyping: true,
    });
    type('AB');
    // The check for "AB" starts once typing pauses, and is held open…
    await new Promise(r => setTimeout(r, 650));
    type('ABC');
    // …then answers while "ABC" waits its turn.
    release?.();
    slowCheck = undefined;
    await new Promise(r => setTimeout(r, 50));
    expect(shown.text?.value).toBe('ABC');
    await vi.waitFor(() =>
      expect(controller.draft.get('programEnrolmentId')).toBe('ABC')
    );
  });

  it('a cleared ID leaves the enrolment with none', async () => {
    const { controller } = mount({
      data: { ...NEW, programEnrolmentId: 'GRY-0042' },
      documentName: 'p/patient/DemoProgramEnrolment',
      allowTyping: true,
    });
    type('');
    await vi.waitFor(() =>
      expect(controller.draft.get('programEnrolmentId')).toBeUndefined()
    );
  });
});

describe('OMS-REG-PAT-04.36 / .37 — a typed ID another enrolment holds', () => {
  it('is flagged at the field once typing pauses (.36)', async () => {
    held.add('HELD-1');
    mount({
      data: { ...NEW, programEnrolmentId: 'GRY-0042' },
      documentName: 'p/patient/DemoProgramEnrolment',
      allowTyping: true,
    });
    type('HELD-1');
    expect(shown.text?.error).toBeUndefined();
    await vi.waitFor(() =>
      expect(shown.text?.error).toBe('error.duplicated-id {"id":"HELD-1"}')
    );
    expect(shown.text?.value).toBe('HELD-1');
  });

  it('is not taken: the enrolment keeps its last accepted ID (.37)', async () => {
    held.add('HELD-1');
    const { controller } = mount({
      data: { ...NEW, programEnrolmentId: 'GRY-0042' },
      documentName: 'p/patient/DemoProgramEnrolment',
      allowTyping: true,
    });
    type('HELD-1');
    await vi.waitFor(() => expect(shown.text?.error).toBeDefined());
    expect(controller.draft.get('programEnrolmentId')).toBe('GRY-0042');
  });

  it('typing again clears the flag', async () => {
    held.add('HELD-1');
    mount({
      data: { ...NEW, programEnrolmentId: 'GRY-0042' },
      documentName: 'p/patient/DemoProgramEnrolment',
      allowTyping: true,
    });
    type('HELD-1');
    await vi.waitFor(() => expect(shown.text?.error).toBeDefined());
    type('HELD-12');
    expect(shown.text?.error).toBeUndefined();
  });
});
