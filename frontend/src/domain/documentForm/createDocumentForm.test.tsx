import { createRoot, createSignal } from 'solid-js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import v1 from '../../../plugins/examples/demo_program/forms/DemoEncounter/v1.json';
import v2 from '../../../plugins/examples/demo_program/forms/DemoEncounter/v2.json';
import v1Fixture from '../../../plugins/examples/demo_program/forms/DemoEncounter/fixtures/v1.json';

/*
 * Opening an older document through the form host
 * (kdd/custom-forms/specs.md § Opening an older document): an archived form
 * read-only until Edit, the current form after migration with unresolved
 * values blocking only the save, kept values round-tripped, and a version
 * the plugin does not list read-only. The GraphQL edge is mocked; AJV, the
 * base schemas and the migration run for real.
 */

const graphqlFetch = vi.fn();
vi.mock('../../api/graphql', () => ({
  graphqlFetch: (...args: unknown[]) => graphqlFetch(...args),
  describeErrors: () => 'refused',
}));

// The library's fields reach for `window`; the host needs only its validator
// and base schemas, which run in node.
vi.mock('./formLibrary', async () => ({
  validateDocument: (await import('./validation')).validateDocument,
  baseSchemaFor: (await import('./baseSchemas')).baseSchemaFor,
}));

import {
  createDocumentForm,
  type DocumentForm,
  type FormVersioning,
} from './createDocumentForm';
import {
  FormDocumentByName,
  UpdateFormEncounter,
  type FormDocumentFragment,
} from './documentForm.generated';
import type { Encounter } from '../../plugin-sdk/documents';

const V1 = 'demo_program_DemoEncounter_v1_test';
const V2 = 'demo_program_DemoEncounter_v2_test';

const registry = {
  __typename: 'DocumentRegistryNode' as const,
  id: 'registry',
  documentType: 'DemoEncounter',
  category: 'ENCOUNTER' as const,
  contextId: 'DemoProgram',
  name: 'Demo follow-up',
  formSchemaId: V2,
  jsonSchema: v2,
};

const documentPinnedTo = (
  schemaId: string,
  jsonSchema: unknown,
  data: unknown
): FormDocumentFragment =>
  ({
    __typename: 'DocumentNode',
    id: `doc-${schemaId}`,
    name: 'encounter/1',
    type: 'DemoEncounter',
    data,
    schema: { __typename: 'JsonschemaNode', id: schemaId, jsonSchema },
    documentRegistry: registry,
  }) as FormDocumentFragment;

const versioning = (archived: number[]): FormVersioning => ({
  versions: [V1, V2],
  migrations: [
    {
      from: 1,
      moved: {
        'extension.demo.weightKg': 'extension.demo.vitals.weightKg',
        'extension.demo.heightCm': 'extension.demo.vitals.heightCm',
      },
      unresolved: { 'extension.demo.regimen': ['LEGACY_TRIAL'] },
      kept: { 'extension.demo.adherence': () => 'Adherence notes' },
    },
  ],
  archived,
});

let dispose: (() => void) | undefined;
afterEach(() => {
  dispose?.();
  dispose = undefined;
  graphqlFetch.mockReset();
});

const open = async (
  loaded: FormDocumentFragment,
  archived: number[]
): Promise<DocumentForm<Encounter>> => {
  graphqlFetch.mockImplementation(async (query: unknown, variables: any) => {
    if (query === FormDocumentByName) {
      return { kind: 'success', data: { document: loaded } };
    }
    if (query === UpdateFormEncounter) {
      const saved = documentPinnedTo(
        variables.input.schemaId,
        v2,
        variables.input.data
      );
      return {
        kind: 'success',
        data: { updateEncounter: { id: 'encounter-1', document: saved } },
      };
    }
    throw new Error('unexpected query');
  });
  const form = createRoot(d => {
    dispose = d;
    const [source] = createSignal({
      kind: 'existing' as const,
      name: 'encounter/1',
    });
    return createDocumentForm<Encounter>({
      storeId: () => 'store',
      patientId: () => 'patient',
      source,
      versioning: type =>
        type === 'DemoEncounter' ? versioning(archived) : undefined,
    });
  });
  await vi.waitFor(() => expect(form.status()).toBe('ready'), {
    timeout: 5000,
  });
  return form;
};

const demo = (form: DocumentForm<Encounter>) =>
  (form.draft.data as { extension?: { demo?: Record<string, unknown> } })
    .extension?.demo;

describe('opening a document pinned to an earlier version', () => {
  it('shows the archived form read-only, as recorded, with nothing to fix', async () => {
    const form = await open(documentPinnedTo(V1, v1, v1Fixture), [1]);
    expect(form.version()).toEqual({ kind: 'archived', version: 1 });
    expect(form.draft.readOnly()).toBe(true);
    expect(demo(form)?.weightKg).toBe(68);
    expect(demo(form)?.regimen).toBe('LEGACY_TRIAL');
    // Read against its own schema: v1's format for the next visit.
    expect(
      form.draft.schemaFor('extension.demo.nextVisit' as never)?.format
    ).toBe('date-time');
    expect(form.validation.valid()).toBe(true);
    expect(form.canSave()).toBe(false);
    expect(form.kept()).toEqual([]);
    expect(await form.save()).toBeUndefined();
    expect(graphqlFetch).toHaveBeenCalledTimes(1);
  });

  it('migrates on Edit, blocks the save on the unresolved value, then re-pins', async () => {
    const form = await open(documentPinnedTo(V1, v1, v1Fixture), [1]);
    form.edit();
    expect(form.version()).toEqual({ kind: 'migrated', version: 1 });
    expect(form.draft.readOnly()).toBe(false);
    expect(demo(form)?.vitals).toEqual({ weightKg: 68, heightCm: 172 });
    expect(demo(form)?.weightKg).toBeUndefined();
    expect(form.draft.unresolved('extension.demo.regimen' as never)).toBe(
      'LEGACY_TRIAL'
    );
    expect(form.kept()).toEqual([
      {
        path: 'extension.demo.adherence',
        label: 'Adherence notes',
        value: 'Missed two doses last month while travelling.',
      },
    ]);
    expect(form.isDirty()).toBe(false);
    expect(form.canSave()).toBe(true);

    expect(await form.save()).toBeUndefined();
    expect(form.draft.errorFor('extension.demo.regimen' as never)).toBe(
      'error.document-previously-recorded'
    );

    form.draft.set('extension.demo.regimen' as never, 'SECOND_LINE' as never);
    const saved = await form.save();
    expect(saved?.schema?.id).toBe(V2);
    const [, variables] = graphqlFetch.mock.calls.at(-1) as [
      unknown,
      { input: { schemaId: string; parent: string; data: any } },
    ];
    expect(variables.input.schemaId).toBe(V2);
    expect(variables.input.parent).toBe(`doc-${V1}`);
    expect(variables.input.data.extension.demo).toEqual({
      vitals: { weightKg: 68, heightCm: 172 },
      regimen: 'SECOND_LINE',
      nextVisit: '2026-08-29T12:00:00.000Z',
      notes: 'Reports feeling well; some tiredness in the afternoons.',
      adherence: 'Missed two doses last month while travelling.',
    });
    // The saved version is current, and its kept value is still listed.
    await vi.waitFor(() => expect(form.version()).toEqual({ kind: 'current' }));
    expect(form.kept().map(k => k.path)).toEqual(['extension.demo.adherence']);
  });

  it('migrates straight away where the version has no archived form', async () => {
    const form = await open(documentPinnedTo(V1, v1, v1Fixture), []);
    expect(form.version()).toEqual({ kind: 'migrated', version: 1 });
    expect(demo(form)?.vitals).toEqual({ weightKg: 68, heightCm: 172 });
  });

  it('discards back to the migrated document, not the stored one', async () => {
    const form = await open(documentPinnedTo(V1, v1, v1Fixture), []);
    form.draft.set('extension.demo.notes' as never, 'changed' as never);
    expect(form.isDirty()).toBe(true);
    form.discard();
    expect(form.isDirty()).toBe(false);
    expect(demo(form)?.vitals).toEqual({ weightKg: 68, heightCm: 172 });
    expect(form.draft.unresolved('extension.demo.regimen' as never)).toBe(
      'LEGACY_TRIAL'
    );
  });

  it('opens a version the plugin does not list read-only', async () => {
    const form = await open(
      documentPinnedTo('demo_program_DemoEncounter_v3_newer', v2, {}),
      [1]
    );
    expect(form.version()).toEqual({ kind: 'unknown' });
    expect(form.draft.readOnly()).toBe(true);
    expect(form.canSave()).toBe(false);
  });

  it('opens a current document as it is', async () => {
    const data = {
      ...v1Fixture,
      extension: { demo: { vitals: { weightKg: 70 } } },
    };
    const form = await open(documentPinnedTo(V2, v2, data), [1]);
    expect(form.version()).toEqual({ kind: 'current' });
    expect(form.draft.readOnly()).toBe(false);
    expect(form.canSave()).toBe(false);
  });
});
