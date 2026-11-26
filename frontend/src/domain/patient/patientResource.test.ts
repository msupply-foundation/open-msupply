import { afterEach, describe, expect, it, vi } from 'vitest';

/*
 * Linking a patient from another facility (spec/patients S2b, S6;
 * OMS-REG-DIS-01.89/.90): once linked, the patient is read here by id. On a
 * site syncing over v5/v6 the link reaches only central, so the read finds no
 * one until the next sync. The GraphQL layer is mocked; the outcome mapping
 * runs for real.
 */

const graphqlFetch = vi.fn();
vi.mock('../../api/graphql', () => ({
  graphqlFetch: (...args: unknown[]) => graphqlFetch(...args),
}));

import { fetchPatientOptionById, linkPatientToStore } from './patientResource';
import { LinkPatientToStore, PatientOptionById } from './patient.generated';

afterEach(() => graphqlFetch.mockReset());

const PATIENT = {
  id: 'p1',
  code: 'P1',
  code2: null,
  name: 'Doe, Jane',
  firstName: 'Jane',
  lastName: 'Doe',
  gender: null,
  dateOfBirth: null,
  isDeceased: false,
};

const linked = {
  kind: 'success',
  data: {
    linkPatientToStore: {
      __typename: 'NameStoreJoinNode',
      id: 'j1',
      nameId: 'p1',
      storeId: 's1',
    },
  },
};
const read = (nodes: (typeof PATIENT)[]) => ({
  kind: 'success',
  data: { patients: { __typename: 'PatientConnector', nodes } },
});

/** Answer each operation by its document. */
const answer = (replies: Map<unknown, unknown>) =>
  graphqlFetch.mockImplementation(async (doc: unknown) => replies.get(doc));

describe('OMS-REG-DIS-01.89 — linking checks the patient’s record is here', () => {
  it('is linked when the record is here', async () => {
    answer(
      new Map<unknown, unknown>([
        [LinkPatientToStore, linked],
        [PatientOptionById, read([PATIENT])],
      ])
    );
    expect(await linkPatientToStore('s1', 'p1')).toEqual({
      kind: 'ok',
      nameId: 'p1',
    });
    expect(graphqlFetch).toHaveBeenCalledWith(PatientOptionById, {
      storeId: 's1',
      id: 'p1',
    });
  });

  it('is not here yet when the read finds no one', async () => {
    answer(
      new Map<unknown, unknown>([
        [LinkPatientToStore, linked],
        [PatientOptionById, read([])],
      ])
    );
    expect(await linkPatientToStore('s1', 'p1')).toEqual({
      kind: 'notHereYet',
    });
  });

  it('goes ahead as linked when the read fails', async () => {
    answer(
      new Map<unknown, unknown>([
        [LinkPatientToStore, linked],
        [PatientOptionById, { kind: 'networkError' }],
      ])
    );
    expect((await linkPatientToStore('s1', 'p1')).kind).toBe('ok');
  });

  it('reads nothing when central can’t be reached', async () => {
    answer(
      new Map<unknown, unknown>([
        [
          LinkPatientToStore,
          {
            kind: 'success',
            data: {
              linkPatientToStore: {
                __typename: 'LinkPatientPatientToStoreError',
                error: {
                  __typename: 'ConnectionError',
                  description: 'Failed to reach central server',
                },
              },
            },
          },
        ],
      ])
    );
    expect(await linkPatientToStore('s1', 'p1')).toEqual({
      kind: 'unreachable',
      message: 'Failed to reach central server',
    });
    expect(graphqlFetch).toHaveBeenCalledTimes(1);
  });
});

describe('reading a patient by id', () => {
  it('tells a patient found, missing and a failed read apart', async () => {
    graphqlFetch.mockResolvedValueOnce(read([PATIENT]));
    expect(await fetchPatientOptionById('s1', 'p1')).toEqual({
      kind: 'found',
      patient: PATIENT,
    });
    graphqlFetch.mockResolvedValueOnce(read([]));
    expect(await fetchPatientOptionById('s1', 'p1')).toEqual({
      kind: 'missing',
    });
    graphqlFetch.mockResolvedValueOnce({ kind: 'networkError' });
    expect(await fetchPatientOptionById('s1', 'p1')).toEqual({
      kind: 'failed',
    });
  });
});
