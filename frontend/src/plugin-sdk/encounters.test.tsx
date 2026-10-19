import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot } from 'solid-js';

/*
 * The encounter data functions: the previous encounter of a type, migrated to
 * the current one. The transport, the entered store and the plugin registry are
 * the mocked edges; the request shape and the migration run for real. `.tsx`
 * for the client Solid build (vitest.workspace.ts), where the read tracks.
 */

const graphqlFetch = vi.fn();
const versioning = vi.fn();

vi.mock('../api/graphql', () => ({
  graphqlFetch: (...args: unknown[]) => graphqlFetch(...args),
}));
vi.mock('../store/storeContext', () => ({ currentStoreId: () => 'store-a' }));
vi.mock('../plugins/documentFormSlot', () => ({
  documentFormVersioning: (...args: unknown[]) => versioning(...args),
}));

import { currentData, usePreviousEncounter } from './encounters';
import type { Encounter } from './documents';

const settle = () => new Promise(resolve => setTimeout(resolve, 0));

beforeEach(() => {
  graphqlFetch.mockReset();
  versioning.mockReset();
});

const node = (schemaId: string, data: unknown) => ({
  __typename: 'EncounterNode' as const,
  startDatetime: '2025-04-14T08:00:00Z',
  status: 'VISITED' as const,
  document: {
    __typename: 'DocumentNode' as const,
    data,
    schema: { __typename: 'JsonschemaNode' as const, id: schemaId },
  },
});

describe('currentData', () => {
  it('returns a document as it is where its type declares no versioning', () => {
    versioning.mockReturnValue(undefined);
    expect(currentData(node('any', { a: 1 }), 'T')).toEqual({ a: 1 });
  });

  it('migrates a document pinned to an earlier version', () => {
    versioning.mockReturnValue({
      versions: ['v1', 'v2'],
      migrations: [{ from: 1, moved: { 'extension.old': 'extension.new' } }],
      archived: [],
    });
    expect(currentData(node('v1', { extension: { old: 'x' } }), 'T')).toEqual({
      extension: { new: 'x' },
    });
    expect(currentData(node('v2', { extension: { new: 'y' } }), 'T')).toEqual({
      extension: { new: 'y' },
    });
  });

  it('returns nothing for a version this frontend does not know', () => {
    versioning.mockReturnValue({
      versions: ['v1'],
      migrations: [],
      archived: [],
    });
    expect(currentData(node('v9', {}), 'T')).toBeUndefined();
  });
});

describe('usePreviousEncounter', () => {
  it("asks for the patient's latest encounter of the type before this one", async () => {
    versioning.mockReturnValue(undefined);
    graphqlFetch.mockResolvedValue({
      kind: 'success',
      data: {
        encounters: {
          __typename: 'EncounterConnector',
          nodes: [node('v1', { extension: { note: 'earlier' } })],
        },
      },
    });
    const read = createRoot(() =>
      usePreviousEncounter<Encounter & { extension?: { note?: string } }>(
        () => ({
          patientId: 'fatouma',
          documentType: 'ReproductiveHealthProgramEncounter',
          before: '2025-06-02T09:00:00.000Z',
        })
      )
    );
    await settle();
    const [, variables] = graphqlFetch.mock.calls[0] as [
      unknown,
      { filter: unknown },
    ];
    expect(variables.filter).toEqual({
      patientId: { equalTo: 'fatouma' },
      type: { equalTo: 'ReproductiveHealthProgramEncounter' },
      status: { equalTo: 'VISITED' },
      startDatetime: { beforeOrEqualTo: '2025-06-02T08:59:59.999Z' },
    });
    expect(read.data()?.data.extension?.note).toBe('earlier');
    expect(read.data()?.startDatetime).toBe('2025-04-14T08:00:00Z');
  });

  it('reads nothing while the encounter has no start', async () => {
    createRoot(() => usePreviousEncounter(() => undefined));
    await settle();
    expect(graphqlFetch).not.toHaveBeenCalled();
  });
});
