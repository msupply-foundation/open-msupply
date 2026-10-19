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
  loading: boolean;
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
// Whether the user may edit documents at this store (drawing a number needs it).
let canEditDocuments = true;
vi.mock('../../store/storeContext', () => ({
  currentStoreId: () => 'store',
  hasPermission: (permission: string) =>
    permission === 'DOCUMENT_MUTATE' && canEditDocuments,
}));

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
  vi.useRealTimers();
  dispose?.();
  dispose = undefined;
  slowCheck = undefined;
  held.clear();
  canEditDocuments = true;
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
    // The pause before a check is the clock's, so the test moves the clock.
    vi.useFakeTimers();
    let release: (() => void) | undefined;
    slowCheck = new Promise<void>(r => (release = r));
    const { controller } = mount({
      data: { ...NEW, programEnrolmentId: 'GRY-0042' },
      documentName: 'p/patient/DemoProgramEnrolment',
      allowTyping: true,
    });
    type('AB');
    // The check for "AB" starts once typing pauses, and is held open…
    await vi.runOnlyPendingTimersAsync();
    type('ABC');
    // …then answers while "ABC" waits its turn.
    release?.();
    slowCheck = undefined;
    await vi.advanceTimersByTimeAsync(0);
    expect(shown.text?.value).toBe('ABC');
    expect(controller.draft.get('programEnrolmentId')).toBe('ABC');
    // "ABC" is checked in its turn, and stands.
    await vi.runOnlyPendingTimersAsync();
    await controller.settled();
    expect(controller.draft.get('programEnrolmentId')).toBe('ABC');
    expect(shown.text?.value).toBe('ABC');
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

describe('OMS-REG-PAT-04.54 — surrounding spaces are not part of the ID', () => {
  it('the enrolment takes the ID without them; the box keeps what was typed', () => {
    const { controller } = mount({
      data: { ...NEW, programEnrolmentId: 'GRY-0042' },
      documentName: 'p/patient/DemoProgramEnrolment',
      allowTyping: true,
    });
    type(' CARD-77 ');
    expect(controller.draft.get('programEnrolmentId')).toBe('CARD-77');
    expect(shown.text?.value).toBe(' CARD-77 ');
  });

  it('a space typed between two parts survives the keystroke', () => {
    const { controller } = mount({
      data: { ...NEW, programEnrolmentId: 'GRY-0042' },
      documentName: 'p/patient/DemoProgramEnrolment',
      allowTyping: true,
    });
    type('CARD ');
    expect(shown.text?.value).toBe('CARD ');
    type('CARD 7');
    expect(controller.draft.get('programEnrolmentId')).toBe('CARD 7');
  });

  it('only spaces leave the enrolment with no ID', () => {
    const { controller } = mount({
      data: { ...NEW, programEnrolmentId: 'GRY-0042' },
      documentName: 'p/patient/DemoProgramEnrolment',
      allowTyping: true,
    });
    type('   ');
    expect(controller.draft.get('programEnrolmentId')).toBeUndefined();
  });

  it('a generated ID replaces what was typed', async () => {
    const { controller } = mount({
      data: { ...NEW, programEnrolmentId: 'GRY-0042' },
      documentName: 'p/patient/DemoProgramEnrolment',
      allowTyping: true,
    });
    type(' CARD-77 ');
    shown.button?.onClick();
    shown.confirm?.onConfirm();
    await vi.waitFor(() =>
      expect(controller.draft.get('programEnrolmentId')).toBe('GRY-0001')
    );
    expect(shown.text?.value).toBe('GRY-0001');
  });
});

describe('OMS-REG-PAT-04.36 / .37 / .51 / .60 — a typed ID another enrolment holds', () => {
  it('is flagged at the field once typing pauses (.36)', async () => {
    held.add('HELD-1');
    const { controller } = mount({
      data: { ...NEW, programEnrolmentId: 'GRY-0042' },
      documentName: 'p/patient/DemoProgramEnrolment',
      allowTyping: true,
    });
    type('HELD-1');
    expect(shown.text?.error).toBeUndefined();
    await controller.settled(); // the pause, and the check after it
    expect(shown.text?.error).toBe('error.duplicated-id {"id":"HELD-1"}');
    expect(shown.text?.value).toBe('HELD-1');
  });

  it('blocks the save while flagged; changed to a free ID, it saves what is shown (.37, .60)', async () => {
    held.add('HELD-1');
    const { controller } = mount({
      data: { ...NEW, programEnrolmentId: 'GRY-0042' },
      documentName: 'p/patient/DemoProgramEnrolment',
      allowTyping: true,
    });
    type('HELD-1');
    expect(controller.draft.get('programEnrolmentId')).toBe('HELD-1');
    await controller.settled();
    expect(shown.text?.error).toBeDefined();
    expect(controller.validation.valid()).toBe(false);
    // Fixing it lifts the block.
    type('FREE-1');
    await controller.settled();
    expect(controller.validation.valid()).toBe(true);
    expect(controller.draft.get('programEnrolmentId')).toBe('FREE-1');
  });

  it('a pause on a free prefix never saves the prefix (.37)', async () => {
    held.add('GRY-0005');
    const { controller } = mount({
      data: { ...NEW, programEnrolmentId: 'GRY-0042' },
      documentName: 'p/patient/DemoProgramEnrolment',
      allowTyping: true,
    });
    type('GRY-000');
    await controller.settled(); // the pause: "GRY-000" is checked, and free
    type('GRY-0005');
    await controller.settled();
    expect(controller.draft.get('programEnrolmentId')).toBe('GRY-0005');
    expect(controller.validation.valid()).toBe(false);
  });

  it('a save made while the typed ID is still being checked waits for it (.51)', async () => {
    held.add('HELD-1');
    const { controller } = mount({
      data: { ...NEW, programEnrolmentId: 'GRY-0042' },
      documentName: 'p/patient/DemoProgramEnrolment',
      allowTyping: true,
    });
    type('HELD-1');
    // Before the pause has passed, nothing is flagged yet, but the form is
    // busy: a save waits, and then finds the duplicate.
    expect(controller.validation.valid()).toBe(true);
    expect(controller.busy()).toBe(true);
    await controller.settled();
    expect(controller.validation.valid()).toBe(false);
  });

  it('typing again clears the flag', async () => {
    held.add('HELD-1');
    const { controller } = mount({
      data: { ...NEW, programEnrolmentId: 'GRY-0042' },
      documentName: 'p/patient/DemoProgramEnrolment',
      allowTyping: true,
    });
    type('HELD-1');
    await controller.settled();
    expect(shown.text?.error).toBeDefined();
    type('HELD-12');
    expect(shown.text?.error).toBeUndefined();
  });
});

// An ID drawn on request, answered when the test says.
const slowDraw = () => {
  let answer: ((id: string | undefined) => void) | undefined;
  const generate = vi.fn(
    () => new Promise<string | undefined>(r => (answer = r))
  );
  return { generate, answer: (id: string | undefined) => answer?.(id) };
};

describe("OMS-REG-PAT-04.56 / .57 — while a new enrolment's ID is being drawn", () => {
  it('a save waits for the ID, and then has it (.56)', async () => {
    const draw = slowDraw();
    const { controller } = mount({ data: NEW, generate: draw.generate });
    expect(controller.busy()).toBe(true);
    const settled = controller.settled();
    draw.answer('GRY-0007');
    await settled;
    expect(controller.draft.get('programEnrolmentId')).toBe('GRY-0007');
    expect(controller.busy()).toBe(false);
  });

  it('the box cannot be typed in until the ID arrives (.57)', async () => {
    const draw = slowDraw();
    mount({ data: NEW, generate: draw.generate, allowTyping: true });
    expect(shown.text?.readOnly).toBe(true);
    draw.answer('GRY-0007');
    await vi.waitFor(() => expect(shown.text?.readOnly).toBe(false));
    expect(shown.text?.value).toBe('GRY-0007');
  });

  it('a draw that arrives after the field was reseeded is dropped', async () => {
    // Generate pressed on a saved enrolment, then the edit is discarded
    // (reseeded) before the draw answers: the draw no longer applies.
    const draw = slowDraw();
    const { controller } = mount({
      data: { ...NEW, programEnrolmentId: 'GRY-0042' },
      documentName: 'p/patient/DemoProgramEnrolment',
      generate: draw.generate,
    });
    shown.button?.onClick();
    shown.confirm?.onConfirm();
    controller.reset({ ...NEW, programEnrolmentId: 'KEPT-1' });
    draw.answer('GRY-0007');
    // Let the draw finish its own steps (the duplicate check), whether or
    // not a save would wait on it.
    await vi.waitFor(() => expect(shown.button?.loading).toBe(false));
    await controller.settled();
    expect(controller.draft.get('programEnrolmentId')).toBe('KEPT-1');
  });

  it('a failed draw leaves the field empty, and nothing waits on it', async () => {
    const draw = slowDraw();
    const { controller } = mount({ data: NEW, generate: draw.generate });
    draw.answer(undefined);
    await controller.settled();
    expect(controller.draft.get('programEnrolmentId')).toBeUndefined();
    expect(controller.busy()).toBe(false);
  });
});

describe('OMS-REG-PAT-04.58 — a generated ID the field gives up on', () => {
  it('keeps it, flagged as a duplicate, and the save is refused', async () => {
    // A format whose number part does not move: every draw is the same, held.
    held.add('FIXED-1');
    const { controller } = mount({
      data: NEW,
      generate: vi.fn(async () => 'FIXED-1'),
    });
    await vi.waitFor(() =>
      expect(controller.draft.get('programEnrolmentId')).toBe('FIXED-1')
    );
    expect(shown.text?.error).toBe('error.duplicated-id {"id":"FIXED-1"}');
    expect(controller.validation.valid()).toBe(false);
  });
});

describe("OMS-REG-PAT-04.59 — without the store's document edit permission", () => {
  it('a new enrolment opens with no ID drawn, and Generate is still offered', async () => {
    canEditDocuments = false;
    const { generate } = mount({ data: NEW });
    await Promise.resolve();
    expect(generate).not.toHaveBeenCalled();
    expect(shown.text?.value).toBe('');
    expect(shown.button?.disabled).toBe(false);
  });
});
