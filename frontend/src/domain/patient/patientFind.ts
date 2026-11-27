import { graphqlFetch } from '../../api/graphql';
import { isCentralServer } from '../../api/serverInfo';
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

const patientFilter = (
  terms: FindTerms,
  isVisible: boolean
): NonNullable<PatientFindVariables['filter']> => {
  const id = terms.id.trim();
  return {
    ...baseFilter(terms),
    ...(id ? { codeOrCode2: { startsWith: id } } : {}),
    isVisible,
  };
};

// This site's patients visible in the store (`isVisible`), or the rest of
// them: a page matching every term given, from `offset`.
const findOnSite = async (
  storeId: string,
  terms: FindTerms,
  offset: number,
  isVisible: boolean
): Promise<FindResult | undefined> => {
  const rows = await fetchRows(
    storeId,
    patientFilter(terms, isVisible),
    FIND_LIMIT + 1,
    offset
  );
  if (!rows) return undefined;
  return { rows: rows.slice(0, FIND_LIMIT), more: rows.length > FIND_LIMIT };
};

/**
 * A page of this store's patients (those visible in it) matching every term
 * given, from `offset`. A patient ID matches the start of the code or the
 * National ID (code2). `undefined` when the request failed (handled
 * globally).
 */
export const findPatients = (
  storeId: string,
  terms: FindTerms,
  offset = 0
): Promise<FindResult | undefined> => findOnSite(storeId, terms, offset, true);

/**
 * Other facilities' patients. Out of reach (`unreachable`) or too slow
 * (`slow`), the central server's are missing, but `site` still has this
 * site's own patients at other stores.
 */
export type CentralFind =
  | { kind: 'ok'; rows: PatientFindRow[]; more: boolean }
  | { kind: 'unreachable'; site?: FindResult }
  | { kind: 'slow'; site?: FindResult }
  | { kind: 'failed' };

// The server's name order: name ignoring case, then date of birth, then id.
const byName = (a: PatientFindRow, b: PatientFindRow) =>
  a.name.toLocaleLowerCase().localeCompare(b.name.toLocaleLowerCase()) ||
  (a.dateOfBirth ?? '').localeCompare(b.dateOfBirth ?? '') ||
  a.id.localeCompare(b.id);

// The most of this site's own patients at other stores a search reads, as
// the server's sorted search does.
const SITE_SPAN = 1000;

export type OtherFacilityOptions = {
  /** The page's first row. */
  offset?: number;
  /** Central was out of reach moments ago: this site's alone, `unreachable`. */
  skipCentral?: boolean;
  /**
   * This site's own patients at other stores for the first page, as soon as
   * they're found: central's take longer, and come merged with them.
   */
  onSite?: (site: FindResult) => void;
};

/**
 * A page of other facilities' patients for the same terms, in name order.
 * The ID matches the start of the code or the National ID, as here. On the
 * central server, which holds every site's patients, they're its own patients
 * not visible in this store. On a remote site they're the central server's
 * (it sends no display name), with this site's own patients at other stores
 * alongside, so those are found even when central isn't.
 */
export const findOtherFacilityPatients = async (
  storeId: string,
  terms: FindTerms,
  { offset = 0, skipCentral = false, onSite }: OtherFacilityOptions = {}
): Promise<CentralFind> => {
  if (isCentralServer()) {
    const result = await findOnSite(storeId, terms, offset, false);
    return result ? { kind: 'ok', ...result } : { kind: 'failed' };
  }
  // This site's own patients at other stores, in name order: few on a remote
  // site, so read whole for every page (and retry), each page taking those
  // that fall within it
  const siteRequest = fetchRows(
    storeId,
    patientFilter(terms, false),
    SITE_SPAN,
    0
  );
  const sitePage = (site: PatientFindRow[] | undefined) =>
    site && {
      rows: site.slice(offset, offset + FIND_LIMIT),
      more: site.length > offset + FIND_LIMIT,
    };
  if (skipCentral)
    return { kind: 'unreachable', site: sitePage(await siteRequest) };
  if (onSite && offset === 0)
    void siteRequest.then(site => {
      const page = sitePage(site);
      if (page) onSite(page);
    });
  const dob = terms.dob;
  // From the row before the page, so a site patient falling between two pages
  // has a page to go on
  const before = offset > 0 ? 1 : 0;
  const [site, outcome] = await Promise.all([
    siteRequest,
    searchCentralPatients(storeId, {
      lastName: terms.lastName.trim() || null,
      firstName: terms.firstName.trim() || null,
      code: terms.id.trim() || null,
      dateOfBirth: dob?.exact ? dob.from : null,
      dateOfBirthFrom: dob && !dob.exact ? dob.from : null,
      dateOfBirthTo: dob && !dob.exact ? dob.to : null,
      first: FIND_LIMIT + 1 + before,
      offset: offset - before,
    }),
  ]);
  if (outcome.kind === 'unreachable' || outcome.kind === 'slow')
    return { kind: outcome.kind, site: sitePage(site) };
  if (outcome.kind !== 'ok') return outcome;
  const central: PatientFindRow[] = outcome.nodes.map(n => ({
    ...n,
    name: [n.lastName, n.firstName].filter(Boolean).join(', '),
    address1: n.address1 ?? null,
  }));
  const previous = before ? central[0] : undefined;
  const page = central.slice(before);
  const more = page.length > FIND_LIMIT;
  const rows = page.slice(0, FIND_LIMIT);
  // Central holds this site's patients once they've synced; those it doesn't
  // have yet go on the page their name falls within
  const onCentral = new Set(central.map(r => r.id));
  const last = more ? rows[rows.length - 1] : undefined;
  const notYetOnCentral = (site ?? []).filter(
    r =>
      !onCentral.has(r.id) &&
      (!previous || byName(r, previous) > 0) &&
      (!last || byName(r, last) <= 0)
  );
  if (notYetOnCentral.length === 0) return { kind: 'ok', rows, more };
  return {
    kind: 'ok',
    rows: [...rows, ...notYetOnCentral].sort(byName),
    more,
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
