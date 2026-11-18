import { children, createRoot, createSignal, type JSX } from 'solid-js';
import { createStore } from 'solid-js/store';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/*
 * The create form's code starts out generated, once per opening, on whichever
 * form is showing (spec/patients § generating a code; S2 step ②). The modal's
 * own effect runs for real; the code generator, the Patient registry read and
 * both forms are stand-ins: the plain-path form keeps the props it was given
 * (its draft, and setField to type a code), and the document path's editor is
 * a small fake whose form becomes ready when the test says so.
 *
 * The suite runs without a DOM (vitest.workspace.ts); the modal's one plain
 * element (the form's wrapper <div>) is made by a stand-in `document`.
 */

class FakeNode {
  firstChild: { data: string } | null = null;
  nextSibling = null;
  style = { setProperty() {}, removeProperty() {} };
  set textContent(value: string) {
    this.firstChild = value === '' ? null : { data: String(value) };
  }
  cloneNode() {
    return new FakeNode();
  }
}
// In place before the modal loads: its module registers Solid's delegated
// focusout listener on the document as it is imported.
vi.hoisted(() => {
  const fakeDocument = {
    createElement: () => ({
      innerHTML: '',
      content: { firstChild: new FakeNode() },
    }),
    addEventListener: () => {},
    removeEventListener: () => {},
  };
  vi.stubGlobal('document', fakeDocument);
  vi.stubGlobal('window', { document: fakeDocument });
});

// ---- the stand-ins ----

type PlainFormProps = {
  draft: { code: string };
  setField: (key: 'code', value: string) => void;
};
const shown: { plainForm?: PlainFormProps } = {};

vi.mock('../../../ui/elements/feedback/Dialog', () => ({
  Dialog: (p: { children: JSX.Element }) => children(() => p.children),
}));
vi.mock('../detail/PatientDetailsForm', () => ({
  PatientDetailsForm: (p: PlainFormProps) => {
    shown.plainForm = p;
    return null;
  },
}));
vi.mock('../detail/PatientDocumentFormView', () => ({
  PatientDocumentFormView: () => null,
}));
vi.mock('../../../ui/elements/table/DataTable', () => ({
  DataTable: () => null,
}));
vi.mock('../../../ui/layout/Form/FormErrorSummary', () => ({
  FormErrorSummary: () => null,
}));
vi.mock('../../../ui/elements/feedback/Spinner', () => ({
  Spinner: () => null,
}));
vi.mock('../../../ui/elements/feedback/Alert', () => ({ Alert: () => null }));
vi.mock('../../../ui/elements/buttons/Button', () => ({ Button: () => null }));
vi.mock('../../../ui/layout/Stack/Stack', () => ({ Stack: () => null }));
vi.mock('../../../ui/layout/Stack/HStack', () => ({ HStack: () => null }));
vi.mock('../../../ui/elements/typography/Text', () => ({ Text: () => null }));
vi.mock('../../../ui/elements/feedback/StatusBadge', () => ({
  StatusBadge: () => null,
}));
vi.mock('../../../ui/icons', () => ({
  ArrowRightIcon: () => null,
  CheckIcon: () => null,
  ChevronLeftIcon: () => null,
  PlusCircleIcon: () => null,
  RefreshIcon: () => null,
  SaveIcon: () => null,
  XCircleIcon: () => null,
}));
vi.mock('../../../ui/utils/rem', () => ({
  remToPx: (rem: number) => rem * 16,
}));
vi.mock('../../../intl', () => ({
  t: (key: string) => key,
  tPlural: (key: string) => key,
}));
vi.mock('@solidjs/router', () => ({ useNavigate: () => () => {} }));

let uuid = 0;
vi.mock('../../../uuid', () => ({ generateUUID: () => `patient-${++uuid}` }));

vi.mock('../../../store/storeContext', () => ({
  currentStoreName: () => 'Gryffindor',
}));

vi.mock('../../../domain/patient', () => ({
  minimalPatientOption: (id: string, name: string) => ({ id, name }),
}));
vi.mock('../../../domain/patient/patientResource', () => ({
  linkPatientToStore: vi.fn(),
}));
vi.mock('../../../domain/patient/patientFindColumns', () => ({
  patientFindColumns: () => [],
}));
vi.mock('../../../domain/patient/duplicateCheck', () => ({
  createDuplicateCheck: () => ({
    state: () => ({ status: 'off' }),
    run: async () => {},
    retry: async () => {},
    reset: () => {},
  }),
}));
vi.mock('../patientApi', () => ({ runInsertPatient: vi.fn() }));

const generatePatientCode = vi.fn();
let codeFits = true;
vi.mock('../../../domain/patient/patientCode', () => ({
  generatePatientCode: (...args: unknown[]) => generatePatientCode(...args),
  generatedCodeFits: (storeName: string, pattern: string | undefined) => {
    seenPattern = { storeName, pattern };
    return codeFits;
  },
  createCodeTakenCheck: () => ({
    taken: () => undefined,
    check: async () => false,
  }),
}));
let seenPattern: { storeName: string; pattern: string | undefined } | undefined;

const fetchPatientRegistry = vi.fn();
vi.mock('../detail/programs/programsApi', () => ({
  fetchPatientRegistry: (...args: unknown[]) => fetchPatientRegistry(...args),
}));

// The document path's editor: a draft whose `set` is recorded, and a form
// status the test moves to 'ready'.
const docSet = vi.fn();
const [docStatus, setDocStatus] = createSignal<'loading' | 'ready'>('loading');
let docData: { id: string; code?: string } = { id: '' };
/** Type a code into the document form. */
let docType: (code: string) => void = () => {};
vi.mock('../detail/patientDocumentEditor', () => ({
  createNewPatientDocumentEditor: (params: { patientId: () => string }) => {
    const [data, setData] = createStore<{ code?: string }>({});
    docType = code => setData('code', code);
    docData = {
      get id() {
        return params.patientId();
      },
      get code() {
        return data.code;
      },
    };
    return {
      form: {
        status: docStatus,
        draft: {
          data: docData,
          set: (key: 'code', value: string) => {
            docSet(key, value);
            setData(key, value);
          },
          schemaFor: () => ({ pattern: '^\\d{6}$' }),
        },
        libraryFailed: () => false,
      },
      saving: () => false,
      saveError: () => undefined,
      create: async () => false,
    };
  },
}));

import { CreatePatientModal } from './CreatePatientModal';

// ---- driving the modal ----

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(r => (resolve = r));
  return { promise, resolve };
};
const settle = async () => {
  for (let i = 0; i < 10; i++) await Promise.resolve();
};

let dispose: (() => void) | undefined;
beforeEach(() => {
  generatePatientCode.mockResolvedValue('GRY-0001');
});
afterEach(() => {
  dispose?.();
  dispose = undefined;
  delete shown.plainForm;
  generatePatientCode.mockReset();
  fetchPatientRegistry.mockReset();
  docSet.mockReset();
  setDocStatus('loading');
  codeFits = true;
  seenPattern = undefined;
});

const PLAIN = { entry: undefined };
const DOCUMENT = { entry: { id: 'registry', documentType: 'Patient' } };

const mount = () => {
  const [open, setOpen] = createSignal(true);
  createRoot(d => {
    dispose = d;
    return (
      <CreatePatientModal open={open()} storeId="store" onClose={() => {}} />
    );
  });
  return { setOpen };
};

// ---- the tests ----

describe('OMS-REG-DIS-01.77 — the code starts out generated as the form opens (plain path)', () => {
  it('fills the code with a generated one for the patient being made', async () => {
    fetchPatientRegistry.mockResolvedValue(PLAIN);
    mount();
    await vi.waitFor(() =>
      expect(shown.plainForm?.draft.code).toBe('GRY-0001')
    );
    expect(generatePatientCode).toHaveBeenCalledOnce();
    const [storeId, storeName, id] = generatePatientCode.mock.calls[0];
    expect([storeId, storeName]).toEqual(['store', 'Gryffindor']);
    expect(id).toMatch(/^patient-/);
  });

  it('keeps a code typed before the generated one arrives', async () => {
    const slow = deferred<string>();
    generatePatientCode.mockReturnValue(slow.promise);
    fetchPatientRegistry.mockResolvedValue(PLAIN);
    mount();
    await vi.waitFor(() => expect(generatePatientCode).toHaveBeenCalled());
    shown.plainForm?.setField('code', 'MINE-1');
    slow.resolve('GRY-0001');
    await settle();
    expect(shown.plainForm?.draft.code).toBe('MINE-1');
  });

  it('leaves the code empty when no code could be drawn', async () => {
    generatePatientCode.mockResolvedValue(undefined);
    fetchPatientRegistry.mockResolvedValue(PLAIN);
    mount();
    await vi.waitFor(() => expect(generatePatientCode).toHaveBeenCalled());
    await settle();
    expect(shown.plainForm?.draft.code).toBe('');
  });

  it('generates once per opening, and again for the next opening’s patient', async () => {
    fetchPatientRegistry.mockResolvedValue(PLAIN);
    const { setOpen } = mount();
    await vi.waitFor(() => expect(generatePatientCode).toHaveBeenCalledOnce());
    await settle();
    expect(generatePatientCode).toHaveBeenCalledOnce();
    setOpen(false);
    generatePatientCode.mockResolvedValue('GRY-0002');
    setOpen(true);
    await vi.waitFor(() =>
      expect(shown.plainForm?.draft.code).toBe('GRY-0002')
    );
    const ids = generatePatientCode.mock.calls.map(c => c[2]);
    expect(ids).toHaveLength(2);
    expect(ids[0]).not.toBe(ids[1]);
  });

  it('drops a code that arrives after the form moved on to another patient', async () => {
    const slow = deferred<string>();
    generatePatientCode.mockReturnValueOnce(slow.promise);
    fetchPatientRegistry.mockResolvedValue(PLAIN);
    const { setOpen } = mount();
    await vi.waitFor(() => expect(generatePatientCode).toHaveBeenCalledOnce());
    setOpen(false);
    generatePatientCode.mockResolvedValue('GRY-0002');
    setOpen(true);
    await vi.waitFor(() =>
      expect(shown.plainForm?.draft.code).toBe('GRY-0002')
    );
    slow.resolve('GRY-OLD');
    await settle();
    expect(shown.plainForm?.draft.code).toBe('GRY-0002');
  });

  it('generates nothing when the form’s settings could not be read', async () => {
    fetchPatientRegistry.mockResolvedValue(undefined);
    mount();
    await settle();
    expect(generatePatientCode).not.toHaveBeenCalled();
  });
});

describe('OMS-REG-DIS-01.77 — the code starts out generated as the form opens (document path)', () => {
  it('waits for the document form to be ready, then sets the code on its draft', async () => {
    fetchPatientRegistry.mockResolvedValue(DOCUMENT);
    mount();
    await settle();
    await vi.waitFor(() => expect(docData.id).toMatch(/^patient-/));
    expect(generatePatientCode).not.toHaveBeenCalled();
    setDocStatus('ready');
    await vi.waitFor(() =>
      expect(docSet).toHaveBeenCalledWith('code', 'GRY-0001')
    );
    expect(generatePatientCode.mock.calls[0][2]).toBe(docData.id);
    expect(seenPattern).toEqual({
      storeName: 'Gryffindor',
      pattern: '^\\d{6}$',
    });
  });

  it('leaves the code empty where the schema’s pattern would refuse a generated one', async () => {
    codeFits = false;
    fetchPatientRegistry.mockResolvedValue(DOCUMENT);
    mount();
    await vi.waitFor(() => expect(docData.id).toMatch(/^patient-/));
    setDocStatus('ready');
    await vi.waitFor(() => expect(seenPattern).toBeDefined());
    await settle();
    expect(generatePatientCode).not.toHaveBeenCalled();
    expect(docSet).not.toHaveBeenCalled();
  });

  it('keeps a code typed into the document form before the generated one arrives', async () => {
    const slow = deferred<string>();
    generatePatientCode.mockReturnValue(slow.promise);
    fetchPatientRegistry.mockResolvedValue(DOCUMENT);
    mount();
    await vi.waitFor(() => expect(docData.id).toMatch(/^patient-/));
    setDocStatus('ready');
    await vi.waitFor(() => expect(generatePatientCode).toHaveBeenCalled());
    docType('MINE-1');
    docSet.mockClear();
    slow.resolve('GRY-0001');
    await settle();
    expect(docSet).not.toHaveBeenCalled();
    expect(docData.code).toBe('MINE-1');
  });
});
