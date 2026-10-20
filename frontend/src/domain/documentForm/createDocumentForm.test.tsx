import {
  batch,
  children,
  createRoot,
  createSignal,
  Match,
  Switch,
} from 'solid-js';
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
  isForbidden: () => false,
  missingPermissions: () => [],
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
  type DocumentFormSource,
  type FormVersioning,
} from './createDocumentForm';
import {
  FormDocumentByName,
  InsertFormEncounter,
  UpdateFormEncounter,
  type FormDocumentFragment,
} from './documentForm.generated';
import type { Encounter } from '../../plugin-sdk/documents';
import type { FormParticipation } from '../../plugin-sdk/types';

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

// The variables the mocked GraphQL calls read: a read's name, a save's input.
interface CallVariables {
  name: string;
  input: {
    schemaId: string;
    parent: string;
    data: { extension?: { demo?: unknown } };
  };
}

let dispose: (() => void) | undefined;
afterEach(() => {
  dispose?.();
  dispose = undefined;
  graphqlFetch.mockReset();
});

const open = async (
  loaded: FormDocumentFragment,
  archived: number[],
  // The type's form as the registry has it: versioned (the default), a form
  // declaring no versions, or no plugin form at all.
  pluginForm: FormVersioning | 'unversioned' | 'none' = versioning(archived)
): Promise<DocumentForm<Encounter>> => {
  graphqlFetch.mockImplementation(
    async (query: unknown, variables: CallVariables) => {
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
    }
  );
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
        type === 'DemoEncounter' && typeof pluginForm === 'object'
          ? pluginForm
          : undefined,
      hasPluginForm: type => type === 'DemoEncounter' && pluginForm !== 'none',
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
      CallVariables,
    ];
    expect(variables.input.schemaId).toBe(V2);
    expect(variables.input.parent).toBe(`doc-${V1}`);
    expect(variables.input.data.extension?.demo).toEqual({
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

  it('opens a version the plugin does not list read-only, as recorded', async () => {
    const data = { extension: { demo: { notes: 'from a newer site' } } };
    const form = await open(
      documentPinnedTo('demo_program_DemoEncounter_v3_newer', v2, data),
      [1]
    );
    expect(form.version()).toEqual({ kind: 'unknown' });
    expect(form.draft.readOnly()).toBe(true);
    expect(form.canSave()).toBe(false);
    expect(form.recorded()).toEqual({ schema: v2, data });
    expect(await form.save()).toBeUndefined();
    expect(graphqlFetch).toHaveBeenCalledTimes(1);
  });

  describe('a type no plugin form renders', () => {
    // Fields of the base type only, which the current schema accepts.
    const baseOnly = {
      createdDatetime: '2026-07-30T01:30:00.000Z',
      startDatetime: '2026-07-30T01:30:00.000Z',
      status: 'VISITED',
    };

    it('shows a document holding values beyond the base type as recorded', async () => {
      const form = await open(documentPinnedTo(V1, v1, v1Fixture), [], 'none');
      expect(form.version()).toEqual({ kind: 'unavailable' });
      expect(form.draft.readOnly()).toBe(true);
      expect(form.canSave()).toBe(false);
      expect(form.recorded()?.schema).toBe(v1);
    });

    it('shows a document the current schema refuses as recorded', async () => {
      // No start datetime, which the current schema requires.
      const { startDatetime: _, ...refused } = baseOnly;
      const form = await open(documentPinnedTo(V1, v1, refused), [], 'none');
      expect(form.version()).toEqual({ kind: 'unavailable' });
      expect(form.recorded()?.data).toEqual(refused);
    });

    it('opens base fields the current schema accepts in the default form, editable', async () => {
      const form = await open(documentPinnedTo(V1, v1, baseOnly), [], 'none');
      expect(form.version()).toEqual({ kind: 'current' });
      expect(form.draft.readOnly()).toBe(false);
      expect(form.recorded()).toBeUndefined();
    });
  });

  it('opens another version than the current as unversioned, read-only, where the plugin form declares no versions', async () => {
    const form = await open(
      documentPinnedTo(V1, v1, v1Fixture),
      [],
      'unversioned'
    );
    expect(form.version()).toEqual({ kind: 'unversioned' });
    expect(form.draft.readOnly()).toBe(true);
    expect(form.canSave()).toBe(false);
    expect(form.recorded()?.schema).toBe(v1);
  });

  it('opens a current document in the default form, editable, with no plugin form', async () => {
    const form = await open(documentPinnedTo(V2, v2, {}), [], 'none');
    expect(form.version()).toEqual({ kind: 'current' });
    expect(form.draft.readOnly()).toBe(false);
    expect(form.recorded()).toBeUndefined();
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
    expect(form.recorded()).toBeUndefined();
  });
});

/*
 * Out of step (OMS-REG-PLG-05.27): the plugin form's newest version and the
 * registry entry's current one differ, either way round. No document of the
 * type opens editable, whatever it is pinned to, and none is started.
 */
describe('a type whose plugin form and registry entry are out of step', () => {
  const V3 = 'demo_program_DemoEncounter_v3_test';
  // The registry's v2 is newer than the plugin in the browser.
  const pluginBehind: FormVersioning = {
    versions: [V1],
    migrations: [],
    archived: [],
  };
  // The plugin in the browser has a v3 the registry has not moved to.
  const registryBehind: FormVersioning = {
    ...versioning([]),
    versions: [V1, V2, V3],
  };
  const notes = { extension: { demo: { notes: 'Seen' } } };

  it.each([
    [
      'the plugin is behind, on its newest version',
      pluginBehind,
      V1,
      v1,
      v1Fixture,
    ],
    [
      "the plugin is behind, on the registry's version",
      pluginBehind,
      V2,
      v2,
      notes,
    ],
    [
      "the registry is behind, on the registry's version",
      registryBehind,
      V2,
      v2,
      notes,
    ],
    [
      "the registry is behind, on the plugin's newest version",
      registryBehind,
      V3,
      v2,
      notes,
    ],
  ])(
    'shows a document as recorded, read-only, where %s',
    async (_, pluginForm, pinned, jsonSchema, data) => {
      const form = await open(
        documentPinnedTo(pinned, jsonSchema, data),
        [],
        pluginForm
      );
      expect(form.version()).toEqual({ kind: 'outOfStep' });
      expect(form.draft.readOnly()).toBe(true);
      expect(form.canSave()).toBe(false);
      expect(form.kept()).toEqual([]);
      // As stored, not migrated.
      expect(form.recorded()).toEqual({ schema: jsonSchema, data });
      expect(await form.save()).toBeUndefined();
      expect(graphqlFetch).toHaveBeenCalledTimes(1);
    }
  );

  it('starts no new document', async () => {
    const form = createRoot(d => {
      dispose = d;
      return createDocumentForm<Encounter>({
        storeId: () => 'store',
        patientId: () => 'patient',
        source: () => ({ kind: 'new', registry, data: v1Fixture }),
        versioning: () => pluginBehind,
        hasPluginForm: () => true,
      });
    });
    await vi.waitFor(() => expect(form.status()).toBe('ready'), {
      timeout: 5000,
    });
    expect(form.version()).toEqual({ kind: 'outOfStep' });
    expect(form.draft.readOnly()).toBe(true);
    expect(form.canSave()).toBe(false);
    expect(form.recorded()).toBeUndefined();
    expect(await form.save()).toBeUndefined();
    expect(graphqlFetch).not.toHaveBeenCalled();
  });
});

/*
 * The form's part in the save (FormParticipation through the encounter slot):
 * a plugin form's before-save step runs before the document is persisted and
 * may stop it, its after-save step runs once it is, and its dirty state
 * counts with the draft's.
 */
describe("the form's part in the save", () => {
  // A participant as a plugin form holds one: under its own owner, where it
  // registers its steps, as a form does when it mounts.
  const participate = (
    form: DocumentForm<Encounter>,
    register: (participant: FormParticipation) => void = () => {}
  ) =>
    createRoot(d => {
      const previous = dispose;
      dispose = () => {
        d();
        previous?.();
      };
      const participant = form.coordinator.participationFor('plugin.form');
      register(participant);
      return participant;
    });

  const ready = async () => {
    const form = await open(documentPinnedTo(V1, v1, v1Fixture), []);
    form.draft.set('extension.demo.regimen' as never, 'SECOND_LINE' as never);
    return form;
  };

  const saves = () =>
    graphqlFetch.mock.calls.filter(([query]) => query === UpdateFormEncounter);

  it('stops the save when a before-save step throws, writing nothing', async () => {
    const form = await ready();
    participate(form, p =>
      p.onBeforeSave(() => {
        throw new Error('No stock to give');
      })
    );
    expect(await form.save()).toBeUndefined();
    expect(saves()).toHaveLength(0);
    expect(form.saveError()).toBe('No stock to give');
    expect(form.saving()).toBe(false);
  });

  it('runs the before-save step first and the after-save step with the record', async () => {
    const form = await ready();
    const order: string[] = [];
    participate(form, p => {
      p.onBeforeSave(async () => {
        order.push(`before:${saves().length}`);
      });
      p.onAfterSave(context => {
        order.push(`after:${saves().length}:${context.recordId}`);
      });
    });
    expect(await form.save()).toBeDefined();
    expect(order).toEqual(['before:0', 'after:1:encounter-1']);
    expect(form.saveError()).toBeUndefined();
  });

  it('shows what an after-save step failed to do, the document saved', async () => {
    const form = await ready();
    participate(form, p =>
      p.onAfterSave(() => {
        throw new Error('Could not refresh');
      })
    );
    expect(await form.save()).toBeDefined();
    expect(saves()).toHaveLength(1);
    expect(form.saveError()).toBe('Could not refresh');
  });

  it("counts the form's own dirty state and validity", async () => {
    const form = await open(
      documentPinnedTo(V2, v2, {
        ...v1Fixture,
        extension: { demo: { vitals: { weightKg: 70 } } },
      }),
      []
    );
    const participant = participate(form);
    expect(form.isDirty()).toBe(false);
    participant.setDirty(true);
    expect(form.isDirty()).toBe(true);
    expect(form.canSave()).toBe(true);
    participant.setValidity('batch', { valid: false, message: 'Too many' });
    expect(await form.save()).toBeUndefined();
    expect(form.saveError()).toBe('Too many');
    expect(saves()).toHaveLength(0);
  });

  it("clears the form's dirty state once saved, and lets an after-save step set it again", async () => {
    const form = await ready();
    let stillUnsaved = false;
    const participant = participate(form, p =>
      p.onAfterSave(() => {
        if (stillUnsaved) p.setDirty(true);
      })
    );
    participant.setDirty(true);
    expect(await form.save()).toBeDefined();
    await vi.waitFor(() => expect(form.isDirty()).toBe(false));

    participant.setDirty(true);
    stillUnsaved = true;
    form.draft.set('extension.demo.notes' as never, 'changed' as never);
    expect(await form.save()).toBeDefined();
    expect(form.coordinator.dirty()).toBe(true);
  });
});

/*
 * One form host following a route from record to record, as the patient and
 * encounter screens do: the source and the patient change under it.
 */
describe('when the source changes', () => {
  // A current (v2) document, which saves as it stands.
  const encounter = (name: string, weightKg: number) =>
    ({
      ...documentPinnedTo(V2, v2, {
        ...v1Fixture,
        extension: { demo: { vitals: { weightKg } } },
      }),
      id: `doc-${name}`,
      name,
    }) as FormDocumentFragment;
  const newEncounter = (weightKg: number): DocumentFormSource => ({
    kind: 'new',
    registry,
    data: { ...v1Fixture, extension: { demo: { vitals: { weightKg } } } },
  });
  const weight = (form: DocumentForm<Encounter>) =>
    (demo(form)?.vitals as { weightKg?: number } | undefined)?.weightKg;
  const calls = (query: unknown) =>
    graphqlFetch.mock.calls.filter(([q]) => q === query);

  // Reads answer from `reads`, which a test may hold back; saves echo the
  // data under the name they were made for (an insert under `created`).
  const follow = (
    reads: Record<string, () => Promise<FormDocumentFragment>>,
    first: DocumentFormSource,
    options: {
      created?: string;
      holdSave?: Promise<void>;
      refuseSave?: boolean;
    } = {}
  ) => {
    graphqlFetch.mockImplementation(
      async (query: unknown, variables: CallVariables) => {
        if (query === FormDocumentByName) {
          return {
            kind: 'success',
            data: { document: await reads[variables.name]() },
          };
        }
        await options.holdSave;
        if (options.refuseSave) return { kind: 'graphqlError', errors: [] };
        const data = variables.input.data;
        if (query === UpdateFormEncounter) {
          const parent = variables.input.parent.replace(/^doc-/, '');
          return {
            kind: 'success',
            data: {
              updateEncounter: {
                id: parent,
                document: { ...encounter(parent, 0), data },
              },
            },
          };
        }
        if (query === InsertFormEncounter) {
          const name = options.created ?? 'encounter/created';
          return {
            kind: 'success',
            data: {
              insertEncounter: {
                id: name,
                document: { ...encounter(name, 0), data },
              },
            },
          };
        }
        throw new Error('unexpected query');
      }
    );
    return createRoot(d => {
      dispose = d;
      const [source, setSource] = createSignal<DocumentFormSource>(first);
      const [patientId, setPatientId] = createSignal('patient-1');
      const form = createDocumentForm<Encounter>({
        storeId: () => 'store',
        patientId,
        source,
        versioning: type =>
          type === 'DemoEncounter' ? versioning([1]) : undefined,
        hasPluginForm: type => type === 'DemoEncounter',
      });
      // Together, as a screen derives both from the one record it shows.
      const go = (next: DocumentFormSource, patient = 'patient-1') =>
        batch(() => {
          setPatientId(patient);
          setSource(next);
        });
      return { form, go };
    });
  };
  const ready = (form: DocumentForm<Encounter>) =>
    vi.waitFor(() => expect(form.status()).toBe('ready'), { timeout: 5000 });

  // A form body mounted on 'ready', as every screen mounts one: each mount
  // records the weight the draft held as it mounted.
  const mountOn = (form: DocumentForm<Encounter>) =>
    createRoot(d => {
      const previous = dispose;
      dispose = () => {
        d();
        previous?.();
      };
      const mounts: (number | undefined)[] = [];
      const Body = () => {
        mounts.push(weight(form));
        return null;
      };
      children(() => (
        <Switch>
          <Match when={form.status() === 'ready'}>
            <Body />
          </Match>
        </Switch>
      ));
      return mounts;
    });

  it("mounts the form on the document's data, not on an empty draft", async () => {
    const { form } = follow(
      { 'encounter/a': async () => encounter('encounter/a', 70) },
      { kind: 'existing', name: 'encounter/a' }
    );
    const mounts = mountOn(form);
    await ready(form);
    expect(mounts).toEqual([70]);
  });

  it("keeps the form mounted through saves, a new document's first included", async () => {
    const { form, go } = follow(
      { 'encounter/created': async () => encounter('encounter/created', 80) },
      newEncounter(80),
      { created: 'encounter/created' }
    );
    const mounts = mountOn(form);
    await ready(form);
    expect(await form.save()).toBeDefined();
    // The screen follows the first save to the saved record.
    go({ kind: 'existing', name: 'encounter/created' });
    form.draft.set('extension.demo.notes' as never, 'changed' as never);
    expect(await form.save()).toBeDefined();
    expect(calls(UpdateFormEncounter)).toHaveLength(1);
    expect(form.status()).toBe('ready');
    expect(mounts).toEqual([80]);
  });

  it('leaves a note with no text out of the save', async () => {
    const { form } = follow(
      { 'encounter/a': async () => encounter('encounter/a', 70) },
      { kind: 'existing', name: 'encounter/a' }
    );
    await ready(form);
    form.draft.set('notes' as never, [{ text: '' }, { text: 'Seen' }] as never);
    expect(await form.save()).toBeDefined();
    const [, variables] = calls(UpdateFormEncounter)[0] as [
      unknown,
      { input: { data: { notes?: unknown } } },
    ];
    expect(variables.input.data.notes).toEqual([{ text: 'Seen' }]);
  });

  it('saves nothing before the draft is seeded', async () => {
    const { form } = follow({}, newEncounter(80));
    expect(form.status()).toBe('loading');
    expect(form.canSave()).toBe(false);
    expect(await form.save()).toBeUndefined();
    expect(calls(InsertFormEncounter)).toHaveLength(0);
  });

  it('starts a new document afresh after an existing one, and inserts it', async () => {
    const { form, go } = follow(
      { 'encounter/a': async () => encounter('encounter/a', 70) },
      { kind: 'existing', name: 'encounter/a' }
    );
    await ready(form);
    expect(weight(form)).toBe(70);

    go(newEncounter(80), 'patient-2');
    await ready(form);
    expect(form.document()).toBeUndefined();
    expect(form.isNew()).toBe(true);
    expect(weight(form)).toBe(80);

    await form.save();
    expect(calls(UpdateFormEncounter)).toHaveLength(0);
    expect(calls(InsertFormEncounter)).toHaveLength(1);
  });

  it('shows nothing of the last document while the next one loads', async () => {
    let loadB!: () => void;
    const bLoaded = new Promise<void>(resolve => (loadB = resolve));
    const { form, go } = follow(
      {
        'encounter/a': async () => encounter('encounter/a', 70),
        'encounter/b': async () => {
          await bLoaded;
          return encounter('encounter/b', 90);
        },
      },
      { kind: 'existing', name: 'encounter/a' }
    );
    await ready(form);

    go({ kind: 'existing', name: 'encounter/b' });
    expect(form.document()).toBeUndefined();
    expect(form.status()).toBe('loading');

    loadB();
    await ready(form);
    expect(form.document()?.name).toBe('encounter/b');
    expect(weight(form)).toBe(90);
  });

  it("does not carry one patient's first save over to another's new document", async () => {
    const { form, go } = follow({}, newEncounter(70));
    await ready(form);
    await form.save();
    expect(form.document()?.name).toBe('encounter/created');

    go(newEncounter(80), 'patient-2');
    await ready(form);
    expect(form.document()).toBeUndefined();
    expect(form.isNew()).toBe(true);
    expect(weight(form)).toBe(80);
  });

  it('reports a document that is not there as not found, not loading', async () => {
    const { form, go } = follow(
      {
        'encounter/gone': async () => null as unknown as FormDocumentFragment,
        // Read, but its type has no registry entry left to open it with.
        'encounter/orphan': async () => ({
          ...encounter('encounter/orphan', 70),
          documentRegistry: null,
        }),
      },
      { kind: 'existing', name: 'encounter/gone' }
    );
    await vi.waitFor(() => expect(form.status()).toBe('not-found'), {
      timeout: 5000,
    });
    expect(form.document()).toBeUndefined();

    go({ kind: 'existing', name: 'encounter/orphan' });
    await vi.waitFor(
      () => expect(form.document()?.name).toBe('encounter/orphan'),
      { timeout: 5000 }
    );
    expect(form.status()).toBe('not-found');
  });

  it('does not let a save that returns late stand for the record shown since', async () => {
    let finishSave!: () => void;
    const holdSave = new Promise<void>(resolve => (finishSave = resolve));
    const { form, go } = follow(
      {
        'encounter/a': async () => encounter('encounter/a', 70),
        'encounter/b': async () => encounter('encounter/b', 90),
      },
      { kind: 'existing', name: 'encounter/a' },
      { holdSave }
    );
    await ready(form);
    form.draft.set('extension.demo.vitals.weightKg' as never, 71 as never);
    const saving = form.save();

    go({ kind: 'existing', name: 'encounter/b' });
    finishSave();
    await saving;
    await ready(form);
    expect(form.document()?.name).toBe('encounter/b');
    expect(weight(form)).toBe(90);
  });

  it("does not show a late refusal of one record's save on the record shown since", async () => {
    let finishSave!: () => void;
    const holdSave = new Promise<void>(resolve => (finishSave = resolve));
    const { form, go } = follow(
      {
        'encounter/a': async () => encounter('encounter/a', 70),
        'encounter/b': async () => encounter('encounter/b', 90),
      },
      { kind: 'existing', name: 'encounter/a' },
      { holdSave, refuseSave: true }
    );
    await ready(form);
    form.draft.set('extension.demo.vitals.weightKg' as never, 71 as never);
    const saving = form.save();

    go({ kind: 'existing', name: 'encounter/b' });
    await ready(form);
    finishSave();
    await saving;
    expect(form.document()?.name).toBe('encounter/b');
    expect(form.saveError()).toBeUndefined();

    // Refused while still shown, the record shows it.
    form.draft.set('extension.demo.vitals.weightKg' as never, 91 as never);
    await form.save();
    expect(form.saveError()).toBe('refused');
  });
});
