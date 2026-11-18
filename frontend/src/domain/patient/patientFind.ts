import { graphqlFetch } from '../../api/graphql';
import { type DobRange } from './dobSearch';
import { searchCentralPatients } from './patientResource';
import {
  PatientFind,
  RecentPrescriptionPatients,
  type PatientFindRowFragment,
  type PatientFindVariables,
} from './patientSearchDialog.generated';

// Finding a patient (#631 spike; spec/patients S2): the one search behind the
// patient search dialog and the create form's duplicate check, here and at
// other facilities.

export type PatientFindRow = PatientFindRowFragment;

export type FindTerms = {
  lastName: string;
  firstName: string;
  dob?: DobRange;
  /** The start of the code or the National ID (code2). */
  id: string;
};

/**
 * Rows per page. Pages have no total: one more is fetched to know whether
 * there's a next page.
 */
export const FIND_LIMIT = 50;

export const hasTerms = (terms: FindTerms) =>
  terms.lastName.trim() !== '' ||
  terms.firstName.trim() !== '' ||
  terms.id.trim() !== '' ||
  terms.dob !== undefined;

const baseFilter = (
  terms: FindTerms
): NonNullable<PatientFindVariables['filter']> => {
  const last = terms.lastName.trim();
  const first = terms.firstName.trim();
  const dob = terms.dob;
  return {
    ...(last ? { lastName: { startsWith: last } } : {}),
    ...(first ? { firstName: { startsWith: first } } : {}),
    ...(dob
      ? {
          dateOfBirth: dob.exact
            ? { equalTo: dob.from }
            : { afterOrEqualTo: dob.from, beforeOrEqualTo: dob.to },
        }
      : {}),
  };
};

const fetchRows = async (
  storeId: string,
  filter: PatientFindVariables['filter'],
  first: number,
  offset: number
): Promise<PatientFindRow[] | undefined> => {
  const result = await graphqlFetch(PatientFind, {
    storeId,
    filter,
    first,
    offset,
  });
  if (result.kind !== 'success') return undefined;
  const patients = result.data.patients;
  return patients.__typename === 'PatientConnector' ? patients.nodes : [];
};

/** A page of results: `more` when there's a next page. */
export type FindResult = { rows: PatientFindRow[]; more: boolean };

/**
 * A page of this site's patients matching every term given, from `offset`. A
 * patient ID matches the start of the code or the National ID (code2).
 * `undefined` when the request failed (handled globally).
 */
export const findPatients = async (
  storeId: string,
  terms: FindTerms,
  offset = 0
): Promise<FindResult | undefined> => {
  const id = terms.id.trim();
  const rows = await fetchRows(
    storeId,
    {
      ...baseFilter(terms),
      ...(id ? { codeOrCode2: { startsWith: id } } : {}),
    },
    FIND_LIMIT + 1,
    offset
  );
  if (!rows) return undefined;
  return { rows: rows.slice(0, FIND_LIMIT), more: rows.length > FIND_LIMIT };
};

export type CentralFind =
  | { kind: 'ok'; rows: PatientFindRow[]; more: boolean }
  | { kind: 'unreachable' }
  | { kind: 'slow' }
  | { kind: 'failed' };

/**
 * A page of other facilities' patients for the same terms, from `offset`, in
 * name order. The ID matches the start of the code or the National ID, as
 * here. Central sends no display name.
 */
export const findCentralPatients = async (
  storeId: string,
  terms: FindTerms,
  offset = 0
): Promise<CentralFind> => {
  const dob = terms.dob;
  const outcome = await searchCentralPatients(storeId, {
    lastName: terms.lastName.trim() || null,
    firstName: terms.firstName.trim() || null,
    code: terms.id.trim() || null,
    dateOfBirth: dob?.exact ? dob.from : null,
    dateOfBirthFrom: dob && !dob.exact ? dob.from : null,
    dateOfBirthTo: dob && !dob.exact ? dob.to : null,
    first: FIND_LIMIT + 1,
    offset,
  });
  if (outcome.kind !== 'ok') return outcome;
  return {
    kind: 'ok',
    more: outcome.nodes.length > FIND_LIMIT,
    rows: outcome.nodes.slice(0, FIND_LIMIT).map(n => ({
      ...n,
      name: [n.lastName, n.firstName].filter(Boolean).join(', '),
      address1: n.address1 ?? null,
      phone: n.phone ?? null,
    })),
  };
};

/** The patients of this store's latest prescriptions, newest first. */
export const recentPatients = async (
  storeId: string,
  count: number
): Promise<PatientFindRow[]> => {
  // A list to save looking someone up, so a failure leaves it empty rather
  // than raising the error dialog — e.g. a patient soft-deleted in legacy
  // mSupply, which the invoice's patient refuses to resolve (#659).
  const result = await graphqlFetch(
    RecentPrescriptionPatients,
    { storeId, first: count * 4 },
    { returnGraphqlErrors: true }
  );
  if (result.kind !== 'success') return [];
  const invoices = result.data.invoices;
  if (invoices.__typename !== 'InvoiceConnector') return [];
  const seen = new Set<string>();
  const rows: PatientFindRow[] = [];
  for (const invoice of invoices.nodes) {
    const patient = invoice.patient;
    if (!patient || seen.has(patient.id)) continue;
    seen.add(patient.id);
    rows.push(patient);
    if (rows.length === count) break;
  }
  return rows;
};

/** Accent- and case-free, for comparing what's been checked. */
export const fold = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase()
    .trim();

/** Two names as compared by the duplicate check: no case, no accents. */
export const namesKey = (firstName: string, lastName: string) =>
  `${fold(firstName)}|${fold(lastName)}`;
