import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, createSignal } from 'solid-js';

/*
 * The program data functions (spec/plugins/sdk-contract.md § data access;
 * implementation-plan K1, K2). The transport and the entered store are the
 * mocked edges; the mapping, the request shape and the read's gating run for
 * real. `.tsx` for the client Solid build (vitest.workspace.ts): the reactive
 * read only tracks there.
 */

const graphqlFetch = vi.fn();
const [storeId, setStoreId] = createSignal<string | undefined>('store-a');

vi.mock('../api/graphql', () => ({
  graphqlFetch: (...args: unknown[]) => graphqlFetch(...args),
}));
vi.mock('../store/storeContext', () => ({
  currentStoreId: () => storeId(),
}));

import {
  allocateProgramNumber,
  toProgramEventView,
  useActiveProgramEvents,
  type ActiveProgramEventsInput,
} from './programs';

const node = {
  __typename: 'ProgramEventNode' as const,
  type: 'followUpStatus',
  data: 'Due',
  activeStartDatetime: '2026-10-02T00:00:00Z',
  activeEndDatetime: '2026-11-01T00:00:00Z',
  documentType: 'DemoProgramEnrolment',
  documentName: null,
};

const settle = () => new Promise(resolve => setTimeout(resolve, 0));

beforeEach(() => {
  graphqlFetch.mockReset();
  setStoreId('store-a');
});

describe('allocateProgramNumber', () => {
  it('draws from the named counter, unprefixed, in the entered store', async () => {
    graphqlFetch.mockResolvedValue({
      kind: 'success',
      data: { allocateProgramNumber: { __typename: 'NumberNode', number: 42 } },
    });
    const result = await allocateProgramNumber('HIVProgram');
    expect(result).toEqual({ kind: 'success', data: 42 });
    // The counter name is passed as given: a plugin taking over a deployment
    // continues its old counter only if nothing is prepended to the name.
    expect(graphqlFetch.mock.calls[0]?.[1]).toEqual({
      storeId: 'store-a',
      numberName: 'HIVProgram',
    });
  });

  it('passes a failure through, already reported by the host', async () => {
    graphqlFetch.mockResolvedValue({ kind: 'forbidden' });
    expect(await allocateProgramNumber('HIVProgram')).toEqual({
      kind: 'forbidden',
    });
  });
});

describe('toProgramEventView', () => {
  it("presents the wire's absent values as undefined", () => {
    expect(toProgramEventView({ ...node, data: null })).toEqual({
      type: 'followUpStatus',
      data: undefined,
      activeStartDatetime: '2026-10-02T00:00:00Z',
      activeEndDatetime: '2026-11-01T00:00:00Z',
      documentType: 'DemoProgramEnrolment',
      documentName: undefined,
    });
  });
});

describe('useActiveProgramEvents', () => {
  const success = (nodes: (typeof node)[]) => ({
    kind: 'success',
    data: {
      activeProgramEvents: { __typename: 'ProgramEventConnector', nodes },
    },
  });

  it('reads the events for the patient and target type, never suspending while it does', async () => {
    graphqlFetch.mockResolvedValue(success([node]));
    await createRoot(async dispose => {
      const events = useActiveProgramEvents(() => ({
        patientId: 'patient-1',
        documentType: 'DemoProgramEnrolment',
        types: ['currentRegimen', 'followUpStatus'],
      }));
      // Pending: undefined, not a suspending read.
      expect(events.data()).toBeUndefined();
      await settle();
      expect(events.data()?.map(e => e.data)).toEqual(['Due']);
      expect(graphqlFetch.mock.calls[0]?.[1]).toEqual({
        storeId: 'store-a',
        filter: {
          patientId: { equalTo: 'patient-1' },
          documentType: { equalTo: 'DemoProgramEnrolment' },
          type: { equalAny: ['currentRegimen', 'followUpStatus'] },
        },
      });
      dispose();
    });
  });

  it('is paused by an undefined input, and refetches when the input changes', async () => {
    graphqlFetch.mockResolvedValue(success([node]));
    await createRoot(async dispose => {
      const [input, setInput] = createSignal<
        ActiveProgramEventsInput | undefined
      >(undefined);
      useActiveProgramEvents(input);
      await settle();
      expect(graphqlFetch).not.toHaveBeenCalled();

      setInput({
        patientId: 'patient-1',
        documentType: 'DemoProgramEnrolment',
      });
      await settle();
      expect(graphqlFetch).toHaveBeenCalledTimes(1);

      // The same input, freshly built: keyed on its value, so no refetch.
      setInput({
        patientId: 'patient-1',
        documentType: 'DemoProgramEnrolment',
      });
      await settle();
      expect(graphqlFetch).toHaveBeenCalledTimes(1);

      setInput({
        patientId: 'patient-2',
        documentType: 'DemoProgramEnrolment',
      });
      await settle();
      expect(graphqlFetch).toHaveBeenCalledTimes(2);
      dispose();
    });
  });
});
