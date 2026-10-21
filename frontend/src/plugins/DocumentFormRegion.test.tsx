/*
 * eslint-disable solid/reactivity -- this suite drives the region by hand
 * (createRoot + resolving its return value) instead of rendering it, which is
 * the only way to observe mount/cleanup counts without a DOM. Reading props
 * outside a tracked scope is the assertion here, not a mistake.
 */
/* eslint-disable solid/reactivity */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createEffect,
  createRoot,
  createSignal,
  onCleanup,
  onMount,
} from 'solid-js';
import { definePlugin } from '../plugin-sdk/definePlugin';
import { PLUGIN_API_VERSION } from '../plugin-sdk/apiVersion';
import type {
  AnyContribution,
  EncounterFormProps,
  FormRecordView,
} from '../plugin-sdk/types';
import type { Draft } from '../domain/documentForm/draft';
import type { RecordedDocument } from '../domain/documentForm/createDocumentForm';
import type { Encounter } from '../plugin-sdk/documents';

/*
 * Form resolution for the document form slots (kdd/custom-forms/specs.md §
 * Forms in the UI): the plugin form contributed for the opened document's type,
 * else the host's default form, which also renders in place of a plugin form
 * that throws. The registry runs for real; the session facts `when` reads are
 * the one mocked edge.
 *
 * The fixtures return strings rather than elements, so this runs in the node
 * environment against the client Solid build (vitest.workspace.ts), with
 * reactivity real and no document needed.
 */

vi.mock('./slotContext', () => ({
  slotContext: () => ({
    storeId: 'store-a',
    storeCode: 'GRY',
    permissions: [],
    storeMode: 'dispensary',
    storePreferences: {
      useConsumptionAndStockFromCustomersForInternalOrders: false,
      monthsUnderstock: undefined,
    },
  }),
}));

// The fallback renderer draws DOM; the region only decides where it goes.
vi.mock('../domain/documentForm/DocumentAsRecorded', () => ({
  DocumentAsRecorded: (props: { schema: unknown; data: unknown }) =>
    `as recorded: ${JSON.stringify(props.data)}`,
}));

import { clearPlugins, registerPlugin } from './registry';
import { pluginDiagnostics } from './diagnostics';
import { DocumentFormRegion } from './DocumentFormRegion';

// The region never reads the draft itself; it only hands it to the form.
const draft = {} as Draft<Encounter>;

const register = (code: string, contributions: readonly AnyContribution[]) =>
  registerPlugin({
    code,
    module: definePlugin({
      manifest: {
        code,
        version: '1.0.0',
        pluginApiVersion: PLUGIN_API_VERSION,
      },
      contributions,
    }),
  });

const encounterForm = (
  documentType: string,
  Component: (props: EncounterFormProps) => unknown,
  id = 'encounter'
): AnyContribution => ({
  slot: 'encounter.form',
  id,
  documentType,
  versions: [`${documentType}_v1`],
  Component: Component as never,
});

// Resolves the region's output as the DOM would: every accessor read, down
// to the fixture's string.
const resolve = (value: unknown): unknown =>
  typeof value === 'function' ? resolve((value as () => unknown)()) : value;

const mount = (
  documentType: string,
  record: () => FormRecordView,
  version: {
    archived?: () => number | undefined;
    currentSchemaId?: string;
    recorded?: () => RecordedDocument | undefined;
  } = {}
) => {
  let render!: () => unknown;
  const dispose = createRoot(disposeRoot => {
    const region = DocumentFormRegion({
      slot: 'encounter.form',
      documentType,
      draft,
      get record() {
        return record();
      },
      fallback: () => 'default form',
      get archivedVersion() {
        return version.archived?.();
      },
      get recorded() {
        return version.recorded?.();
      },
      currentSchemaId: version.currentSchemaId,
    });
    render = () => resolve(region);
    render();
    return disposeRoot;
  });
  return { render, dispose };
};

const record = { patientId: 'patient-1', documentName: undefined };

beforeEach(() => {
  clearPlugins();
});

describe('DocumentFormRegion', () => {
  it('renders the default form when no plugin contributes one for the type', () => {
    const { render, dispose } = mount('DemoEncounter', () => record);
    expect(render()).toBe('default form');
    dispose();
  });

  it("renders the plugin form contributed for the document's type, with the draft and the record", () => {
    let received: EncounterFormProps | undefined;
    register('demo_program', [
      encounterForm('DemoEncounter', props => {
        received = props;
        return 'demo form';
      }),
    ]);
    const { render, dispose } = mount('DemoEncounter', () => record);
    expect(render()).toBe('demo form');
    expect(received?.draft).toBe(draft);
    expect(received?.record).toEqual(record);
    dispose();
  });

  it('leaves a document type with no form of its own on the default, whatever other types have', () => {
    register('demo_program', [
      encounterForm('DemoEncounter', () => 'demo form'),
    ]);
    const { render, dispose } = mount('E2EImmunisationEncounter', () => record);
    expect(render()).toBe('default form');
    dispose();
  });

  it('renders the fallback renderer in place of the default form for a document as recorded', () => {
    const { render, dispose } = mount('DemoEncounter', () => record, {
      recorded: () => ({ schema: {}, data: { ward: 'B' } }),
    });
    expect(render()).toBe('as recorded: {"ward":"B"}');
    dispose();
  });

  it("renders the fallback renderer in place of the plugin's form, which is never mounted", () => {
    let mounts = 0;
    register('demo_program', [
      encounterForm('DemoEncounter', () => {
        onMount(() => mounts++);
        return 'demo form';
      }),
    ]);
    const { render, dispose } = mount('DemoEncounter', () => record, {
      recorded: () => ({ schema: {}, data: { ward: 'B' } }),
    });
    expect(render()).toBe('as recorded: {"ward":"B"}');
    expect(mounts).toBe(0);
    dispose();
  });

  it('goes back to the form when the document is no longer shown as recorded', () => {
    register('demo_program', [
      encounterForm('DemoEncounter', () => 'demo form'),
    ]);
    const [recorded, setRecorded] = createSignal<RecordedDocument | undefined>({
      schema: {},
      data: {},
    });
    const { render, dispose } = mount('DemoEncounter', () => record, {
      recorded,
    });
    expect(render()).toBe('as recorded: {}');
    setRecorded(undefined);
    expect(render()).toBe('demo form');
    dispose();
  });

  it('hands a changed record to the live form without remounting it', () => {
    const names: (string | undefined)[] = [];
    let mounts = 0;
    let cleanups = 0;
    register('demo_program', [
      encounterForm('DemoEncounter', props => {
        onMount(() => mounts++);
        onCleanup(() => cleanups++);
        createEffect(() => names.push(props.record.documentName));
        return 'demo form';
      }),
    ]);
    const [current, setCurrent] = createSignal<FormRecordView>(record);
    const { dispose } = mount('DemoEncounter', current);
    expect(names).toEqual([undefined]);

    // The first save names the document.
    setCurrent({ patientId: 'patient-1', documentName: 'encounter/1' });
    expect(names).toEqual([undefined, 'encounter/1']);
    expect(mounts).toBe(1);
    expect(cleanups).toBe(0);
    dispose();
    expect(cleanups).toBe(1);
  });

  it("falls back to the default form when the plugin form's when gate throws", () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    register('demo_program', [
      {
        ...encounterForm('DemoEncounter', () => 'demo form', 'gated'),
        when: () => {
          throw new Error('deliberate');
        },
      } as AnyContribution,
    ]);
    const { render, dispose } = mount('DemoEncounter', () => record);
    expect(render()).toBe('default form');
    expect(pluginDiagnostics().at(-1)).toMatchObject({
      level: 'error',
      pluginCode: 'demo_program',
      message: expect.stringContaining(
        'encounter.form "demo_program.gated" when gate threw'
      ),
    });
    dispose();
    errors.mockRestore();
  });

  it('falls back to the default form, and names the failure, when the plugin form throws', () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    const warnings = vi.spyOn(console, 'warn').mockImplementation(() => {});
    register('demo_program', [
      encounterForm('DemoEncounter', () => {
        throw new Error('deliberate');
      }),
    ]);
    const { render, dispose } = mount('DemoEncounter', () => record);
    expect(render()).toBe('default form');
    expect(pluginDiagnostics().at(-1)).toMatchObject({
      level: 'warning',
      pluginCode: 'demo_program',
      message: expect.stringContaining(
        "encounter.form: demo_program.encounter failed to render — the host's default form is shown in its place"
      ),
    });
    dispose();
    errors.mockRestore();
    warnings.mockRestore();
  });

  it('renders the first claimant of a type in registry order and names the one passed over', () => {
    const warnings = vi.spyOn(console, 'warn').mockImplementation(() => {});
    register('b_plugin', [encounterForm('DemoEncounter', () => 'b form')]);
    register('a_plugin', [encounterForm('DemoEncounter', () => 'a form')]);
    const { render, dispose } = mount('DemoEncounter', () => record);
    // Plugin code breaks the tie, whichever bundle loaded first.
    expect(render()).toBe('a form');
    expect(pluginDiagnostics().at(-1)).toMatchObject({
      pluginCode: 'b_plugin',
      message: expect.stringContaining(
        'passed over: document type "DemoEncounter" renders one form, and "a_plugin.encounter" claimed it first'
      ),
    });
    dispose();
    warnings.mockRestore();
  });
  it('renders the archived form for the version it is told, and the current form after Edit', () => {
    let currentMounts = 0;
    register('demo_program', [
      {
        ...encounterForm('DemoEncounter', () => {
          currentMounts++;
          return 'v2 form';
        }),
        versions: ['v1-id', 'v2-id'],
        archived: { 1: (() => 'v1 form') as never },
      } as AnyContribution,
    ]);
    const [archived, setArchived] = createSignal<number | undefined>(1);
    const { render, dispose } = mount('DemoEncounter', () => record, {
      archived,
      currentSchemaId: 'v2-id',
    });
    expect(render()).toBe('v1 form');
    expect(currentMounts).toBe(0);
    setArchived(undefined);
    expect(render()).toBe('v2 form');
    expect(currentMounts).toBe(1);
    dispose();
  });

  it("names a plugin whose versions end at another schema than the server's", () => {
    const warnings = vi.spyOn(console, 'warn').mockImplementation(() => {});
    register('demo_program', [
      {
        ...encounterForm('DemoEncounter', () => 'v2 form'),
        versions: ['v1-id', 'v2-id'],
      } as AnyContribution,
    ]);
    const { dispose } = mount('DemoEncounter', () => record, {
      currentSchemaId: 'v3-id',
    });
    expect(pluginDiagnostics().at(-1)).toMatchObject({
      pluginCode: 'demo_program',
      message: expect.stringContaining(
        'lists v2-id as the current schema of "DemoEncounter", but the server\'s is v3-id'
      ),
    });
    dispose();
    warnings.mockRestore();
  });
});
