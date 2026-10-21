import { createRoot, createSignal } from 'solid-js';
import { afterEach, describe, expect, it, vi } from 'vitest';

/*
 * The document form host's two opt-in save guards, as the enrolment uses them
 * (spec/program-enrolment rules § saving, § editing an enrolment; cases
 * OMS-REG-PAT-04): a save over a newer version is refused, and a Forbidden
 * goes to the caller's permission-denied route rather than the inline
 * refusal. Without the options, a host saves as before (encounters, the
 * patient document). The GraphQL edge is mocked; the draft, AJV and the base
 * schemas run for real.
 */

interface ErrorItem {
  message: string;
  extensions?: { details?: string };
}

const graphqlFetch = vi.fn();
vi.mock('../../api/graphql', () => ({
  graphqlFetch: (...args: unknown[]) => graphqlFetch(...args),
  describeErrors: (errors: ErrorItem[]) =>
    errors.map(e => e.extensions?.details ?? e.message).join(', '),
  isForbidden: (errors: ErrorItem[]) =>
    errors.some(e => e.message === 'Forbidden'),
  missingPermissions: () => ['DocumentMutate'],
}));

vi.mock('./formLibrary', async () => ({
  validateDocument: (await import('./validation')).validateDocument,
  baseSchemaFor: (await import('./baseSchemas')).baseSchemaFor,
}));

import {
  createDocumentForm,
  type CreateDocumentFormOptions,
  type DocumentForm,
  type DocumentFormSource,
} from './createDocumentForm';
import {
  FormDocumentByName,
  InsertFormProgramEnrolment,
  UpdateFormProgramEnrolment,
  type FormDocumentFragment,
  type FormRegistryFragment,
} from './documentForm.generated';
import type { ProgramEnrolment } from '../../plugin-sdk/documents';

const registry = {
  __typename: 'DocumentRegistryNode',
  id: 'registry',
  documentType: 'DemoProgramEnrolment',
  category: 'PROGRAM_ENROLMENT',
  contextId: 'DemoProgram',
  name: 'Demo Program',
  formSchemaId: 'schema',
  jsonSchema: { type: 'object' },
} as FormRegistryFragment;

const version = (id: string, data: object): FormDocumentFragment =>
  ({
    __typename: 'DocumentNode',
    id,
    name: 'p/patient/DemoProgramEnrolment',
    type: 'DemoProgramEnrolment',
    data,
    schema: { __typename: 'JsonschemaNode', id: 'schema', jsonSchema: {} },
    documentRegistry: registry,
  }) as FormDocumentFragment;

const V1 = version('v1', {
  enrolmentDatetime: '2026-10-01T09:00:00Z',
  programEnrolmentId: 'GRY-0001',
});
const V2 = version('v2', {
  enrolmentDatetime: '2026-10-02T09:00:00Z',
  programEnrolmentId: 'GRY-0001',
});

const refused = (message: string, details: string) => ({
  kind: 'graphqlError',
  message,
  errors: [{ message, extensions: { details } }],
});

let dispose: (() => void) | undefined;
afterEach(() => {
  dispose?.();
  dispose = undefined;
  graphqlFetch.mockReset();
});

const host = async (
  source: DocumentFormSource,
  options: Partial<CreateDocumentFormOptions> = {}
): Promise<DocumentForm<ProgramEnrolment>> => {
  const form = createRoot(d => {
    dispose = d;
    const [s] = createSignal(source);
    return createDocumentForm<ProgramEnrolment>({
      storeId: () => 'store',
      patientId: () => 'patient',
      source: s,
      ...options,
    });
  });
  await vi.waitFor(() => expect(form.status()).toBe('ready'), {
    timeout: 5000,
  });
  return form;
};

const updates = () =>
  graphqlFetch.mock.calls.filter(([q]) => q === UpdateFormProgramEnrolment);

describe('OMS-REG-PAT-04.26 / .27 — a save over a newer version is refused', () => {
  const reads = (...docs: FormDocumentFragment[]) => {
    const queue = [...docs];
    graphqlFetch.mockImplementation(async (query: unknown) => {
      if (query === FormDocumentByName) {
        return { kind: 'success', data: { document: queue.shift() } };
      }
      if (query === UpdateFormProgramEnrolment) {
        return {
          kind: 'success',
          data: { updateProgramEnrolment: { id: 'row', document: V2 } },
        };
      }
      throw new Error('unexpected query');
    });
  };

  it('refuses, writing nothing, when another save landed after the open (.26)', async () => {
    reads(V1, V2);
    const form = await host(
      { kind: 'existing', name: V1.name },
      { refuseNewerVersion: true }
    );
    form.draft.set('programEnrolmentId', 'GRY-0099');
    expect(await form.save()).toBeUndefined();
    expect(form.newerVersion()).toBe(true);
    expect(form.saveError()).toBeUndefined();
    expect(updates()).toHaveLength(0);
  });

  it('keeps the entries, so nothing typed is lost to the refusal (.26)', async () => {
    reads(V1, V2);
    const form = await host(
      { kind: 'existing', name: V1.name },
      { refuseNewerVersion: true }
    );
    form.draft.set('programEnrolmentId', 'GRY-0099');
    await form.save();
    expect(form.draft.get('programEnrolmentId')).toBe('GRY-0099');
  });

  it('reopening shows the newer version (.27)', async () => {
    reads(V2);
    const form = await host(
      { kind: 'existing', name: V1.name },
      { refuseNewerVersion: true }
    );
    expect(form.document()?.id).toBe('v2');
    expect(form.draft.get('enrolmentDatetime')).toBe('2026-10-02T09:00:00Z');
    expect(form.newerVersion()).toBe(false);
  });

  it('saves on top of the opened version when it is still the newest', async () => {
    reads(V1, V1);
    const form = await host(
      { kind: 'existing', name: V1.name },
      { refuseNewerVersion: true }
    );
    form.draft.set('programEnrolmentId', 'GRY-0099');
    expect(await form.save()).toBeDefined();
    expect(updates()).toHaveLength(1);
    expect(updates()[0][1]).toMatchObject({ input: { parent: 'v1' } });
  });

  it('without the guard, the save goes straight through, as the server allows', async () => {
    reads(V1, V2);
    const form = await host({ kind: 'existing', name: V1.name });
    form.draft.set('programEnrolmentId', 'GRY-0099');
    expect(await form.save()).toBeDefined();
    expect(updates()).toHaveLength(1);
    expect(form.newerVersion()).toBe(false);
  });

  it('a new enrolment has no version to compare and saves at once', async () => {
    graphqlFetch.mockResolvedValue({
      kind: 'success',
      data: { insertProgramEnrolment: { id: 'row', document: V1 } },
    });
    const form = await host(
      {
        kind: 'new',
        registry,
        data: { enrolmentDatetime: '2026-10-01T09:00:00Z' },
      },
      { refuseNewerVersion: true }
    );
    expect(await form.save()).toBeDefined();
    expect(graphqlFetch).toHaveBeenCalledTimes(1);
    expect(graphqlFetch.mock.calls[0][0]).toBe(InsertFormProgramEnrolment);
  });
});

describe('OMS-REG-PAT-04.37 / .51 — a check a field is running decides the save', () => {
  it('waits for it, then refuses when it fails the field, sending nothing', async () => {
    const form = await host({
      kind: 'new',
      registry,
      data: { enrolmentDatetime: '2026-10-01T09:00:00Z' },
    });
    let finish: (() => void) | undefined;
    form.draft.wait(new Promise<void>(r => (finish = r)));
    const saving = form.save();
    await Promise.resolve();
    expect(form.saving()).toBe(true);
    form.draft.setError('programEnrolmentId', 'Duplicated ID: GRY-0005');
    finish?.();
    expect(await saving).toBeUndefined();
    expect(graphqlFetch).not.toHaveBeenCalled();
    expect(form.validation.errorFor('programEnrolmentId')).toBe(
      'Duplicated ID: GRY-0005'
    );
  });
});

describe('OMS-REG-PAT-04.20 / .21 / .64 — refusals', () => {
  const NEW: DocumentFormSource = {
    kind: 'new',
    registry,
    data: { enrolmentDatetime: '2026-10-01T09:00:00Z' },
  };

  it('a Forbidden goes to the permission-denied route, not the dialog (.21)', async () => {
    graphqlFetch.mockResolvedValue(
      refused('Forbidden', 'NotAllowedToMutateDocument')
    );
    const onForbidden = vi.fn();
    const form = await host(NEW, { onForbidden });
    expect(await form.save()).toBeUndefined();
    expect(onForbidden).toHaveBeenCalledWith(['DocumentMutate']);
    expect(form.saveError()).toBeUndefined();
  });

  it('already enrolled shows in the dialog with the server reason (.20)', async () => {
    graphqlFetch.mockResolvedValue(
      refused('Bad user input', 'ProgramEnrolmentExists')
    );
    const onForbidden = vi.fn();
    const form = await host(NEW, { onForbidden });
    expect(await form.save()).toBeUndefined();
    expect(form.saveError()).toBe('ProgramEnrolmentExists');
    expect(onForbidden).not.toHaveBeenCalled();
  });

  it('keeps the entries after a refusal (.64)', async () => {
    graphqlFetch.mockResolvedValue(
      refused('Bad user input', 'ProgramEnrolmentExists')
    );
    const form = await host(NEW);
    form.draft.set('programEnrolmentId', 'GRY-0007');
    await form.save();
    expect(form.draft.get('programEnrolmentId')).toBe('GRY-0007');
  });

  it('without a route for it, a Forbidden shows as any refusal', async () => {
    graphqlFetch.mockResolvedValue(
      refused('Forbidden', 'NotAllowedToMutateDocument')
    );
    const form = await host(NEW);
    await form.save();
    expect(form.saveError()).toBe('NotAllowedToMutateDocument');
  });
});
