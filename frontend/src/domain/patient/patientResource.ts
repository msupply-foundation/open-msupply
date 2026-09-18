import { graphqlFetch } from '../../api/graphql';
import type { Page } from '../../ui/utils/createPaginatedSearch';
import {
  PatientSearch,
  type PatientSearchFragment,
  type PatientSearchVariables,
  CentralPatientSearch,
  type CentralPatientSearchResult,
  type CentralPatientSearchVariables,
  LinkPatientToStore,
} from './patient.generated';

// One local search result (spec/patients S4 picker / S2 duplicate check): the
// fields the picker and duplicate-check table show. `score` is dropped — the
// server fabricates a constant 1.0 (spec/patients contract › searching wire
// trap), so it carries no information.
export type PatientOption = PatientSearchFragment['patient'];

// One central-only candidate (spec/patients S2/S2b).
export type CentralPatient = Extract<
  CentralPatientSearchResult['centralPatientSearch'],
  { __typename: 'CentralPatientSearchConnector' }
>['nodes'][number];

// A decoded central outcome. `unreachable` is the ONE patient error the app
// decodes and surfaces (the typed ConnectionError — spec/patients AC-S5);
// `failed` means a transport/unexpected error the global modal already showed.
export type CentralSearchOutcome =
  | { kind: 'ok'; nodes: CentralPatient[] }
  | { kind: 'unreachable'; message: string }
  | { kind: 'failed' };

export type LinkOutcome =
  | { kind: 'ok'; nameId: string }
  | { kind: 'unreachable'; message: string }
  | { kind: 'failed' };

/**
 * Local-search page fetcher for the reusable picker (spec/patients S4). The
 * typed text is placed in `identifier` — the broad match across code /
 * secondary code / name / program-enrolment id. The server hard-codes a
 * 100-row page sorted by code and ignores paging (contract › searching wire
 * trap), so we report `totalCount = rows returned` to stop the picker paging
 * futilely.
 */
export const patientSearchPageFetcher =
  (storeId: string) =>
  async (
    search: string,
    _offset: number
  ): Promise<Page<PatientOption> | undefined> => {
    const result = await graphqlFetch(PatientSearch, {
      storeId,
      input: search ? { identifier: search } : {},
    });
    if (result.kind !== 'success') return undefined;
    const nodes = result.data.patientSearch.nodes.map(node => node.patient);
    return { nodes, totalCount: nodes.length };
  };

/**
 * Local duplicate search for the create flow's step ② (spec/patients AC-S1/S2):
 * code/code2 exact, name/first/last substring, dob/gender exact. Returns the
 * bounded, code-ordered rows, or undefined on a failed fetch.
 */
export const searchLocalPatients = async (
  storeId: string,
  input: PatientSearchVariables['input']
): Promise<PatientOption[] | undefined> => {
  const result = await graphqlFetch(PatientSearch, { storeId, input });
  if (result.kind !== 'success') return undefined;
  return result.data.patientSearch.nodes.map(node => node.patient);
};

/**
 * Resolve one patient for the picker's label when reopened with only a stored
 * id (next of kin restore). Undefined when it doesn't resolve (picker shows
 * empty). Uses the identifier search since there is no single-id search input.
 */
export const fetchPatientOptionById = async (
  storeId: string,
  id: string
): Promise<PatientOption | undefined> => {
  const result = await graphqlFetch(PatientSearch, {
    storeId,
    input: { identifier: id },
  });
  if (result.kind !== 'success') return undefined;
  return result.data.patientSearch.nodes.find(node => node.patient.id === id)
    ?.patient;
};

/**
 * Build a picker option carrying only an id + display name — for seeding a
 * patient picker (next of kin) whose label the caller already holds but whose
 * full record it hasn't fetched. The other fields are placeholders; the picker
 * uses only id (value) + name (label).
 */
export const minimalPatientOption = (
  id: string,
  name: string
): PatientOption => ({
  id,
  name,
  code: '',
  code2: null,
  firstName: null,
  lastName: null,
  gender: null,
  dateOfBirth: null,
  isDeceased: false,
});

/**
 * Central duplicate search (spec/patients AC-S3/S5). Only code / first / last /
 * dob are honoured server-side. Central-unreachable comes back as the TYPED
 * ConnectionError union member (a successful GraphQL response), decoded to
 * `unreachable` here — the one error the app surfaces meaningfully.
 */
export const searchCentralPatients = async (
  storeId: string,
  input: CentralPatientSearchVariables['input']
): Promise<CentralSearchOutcome> => {
  const result = await graphqlFetch(CentralPatientSearch, { storeId, input });
  if (result.kind !== 'success') return { kind: 'failed' };
  const res = result.data.centralPatientSearch;
  if (res.__typename === 'CentralPatientSearchError')
    return { kind: 'unreachable', message: res.error.description };
  return { kind: 'ok', nodes: res.nodes };
};

/**
 * Fetch a central-only patient into the store (spec/patients AC-S4).
 * Registered as a mutation; creates/returns the name_store_join.
 * Central-unreachable is the typed ConnectionError (note the doubled-word type
 * name) — decoded to `unreachable`; the fetch then stops (no retry, per
 * AC-S5).
 */
export const linkPatientToStore = async (
  storeId: string,
  nameId: string
): Promise<LinkOutcome> => {
  const result = await graphqlFetch(LinkPatientToStore, { storeId, nameId });
  if (result.kind !== 'success') return { kind: 'failed' };
  const res = result.data.linkPatientToStore;
  if (res.__typename === 'LinkPatientPatientToStoreError')
    return { kind: 'unreachable', message: res.error.description };
  return { kind: 'ok', nameId: res.nameId };
};
