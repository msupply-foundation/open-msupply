import { afterEach, describe, expect, it, vi } from 'vitest';

/*
 * Finding a patient (spec/patients S2 step ①; cases OMS-REG-DIS-01 `.55`,
 * `.57`, `.67`, `.68`): the one search behind the patient search dialog and the
 * create form's duplicate check. The GraphQL edge and the central search are
 * mocked; the filters, paging and merging run for real. Paging is `.67`,
 * the result order `.68`.
 */

const graphqlFetch = vi.fn();
vi.mock('../../api/graphql', () => ({
  graphqlFetch: (...args: unknown[]) => graphqlFetch(...args),
}));
const searchCentralPatients = vi.fn();
vi.mock('./patientResource', () => ({
  searchCentralPatients: (...args: unknown[]) => searchCentralPatients(...args),
}));

import {
  FIND_LIMIT,
  findCentralPatients,
  findPatients,
  fold,
  hasTerms,
  namesKey,
  recentPatients,
  type FindTerms,
  type PatientFindRow,
} from './patientFind';
import { PatientFind } from './patientSearchDialog.generated';

afterEach(() => {
  graphqlFetch.mockReset();
  searchCentralPatients.mockReset();
});

const row = (
  id: string,
  name: string,
  more: Partial<PatientFindRow> = {}
): PatientFindRow => ({
  id,
  code: id.toUpperCase(),
  code2: null,
  name,
  firstName: null,
  lastName: null,
  gender: null,
  dateOfBirth: null,
  isDeceased: false,
  address1: null,
  phone: null,
  ...more,
});

const rows = (count: number, prefix = 'p') =>
  Array.from({ length: count }, (_, i) =>
    row(`${prefix}${i}`, `Name ${String(i).padStart(3, '0')}`)
  );

const page = (nodes: PatientFindRow[]) => ({
  kind: 'success',
  data: { patients: { __typename: 'PatientConnector', nodes } },
});

const terms = (more: Partial<FindTerms> = {}): FindTerms => ({
  lastName: '',
  firstName: '',
  id: '',
  ...more,
});

type FindVars = {
  filter: Record<string, unknown>;
  first: number;
  offset: number;
};
const calls = () => graphqlFetch.mock.calls.map(c => c[1] as FindVars);

describe('OMS-REG-DIS-01.55 — a search matches every field filled in', () => {
  it('asks for one page and one more row, from the offset, with no ID', async () => {
    graphqlFetch.mockResolvedValue(page([]));
    await findPatients('store', terms({ lastName: ' Smi ' }), 100);
    expect(graphqlFetch).toHaveBeenCalledOnce();
    expect(graphqlFetch.mock.calls[0][0]).toBe(PatientFind);
    expect(calls()[0]).toEqual({
      storeId: 'store',
      filter: { lastName: { startsWith: 'Smi' } },
      first: FIND_LIMIT + 1,
      offset: 100,
    });
  });

  it('filters on each name given, and leaves out the blank ones', async () => {
    graphqlFetch.mockResolvedValue(page([]));
    await findPatients('store', terms({ lastName: 'Smith', firstName: '  ' }));
    expect(calls()[0].filter).toEqual({ lastName: { startsWith: 'Smith' } });
  });

  it('matches a full date of birth exactly', async () => {
    graphqlFetch.mockResolvedValue(page([]));
    await findPatients(
      'store',
      terms({ dob: { from: '1984-03-14', to: '1984-03-14', exact: true } })
    );
    expect(calls()[0].filter).toEqual({
      dateOfBirth: { equalTo: '1984-03-14' },
    });
  });

  it('matches a year or a month as the range it covers', async () => {
    graphqlFetch.mockResolvedValue(page([]));
    await findPatients(
      'store',
      terms({ dob: { from: '1984-01-01', to: '1984-12-31', exact: false } })
    );
    expect(calls()[0].filter).toEqual({
      dateOfBirth: {
        afterOrEqualTo: '1984-01-01',
        beforeOrEqualTo: '1984-12-31',
      },
    });
  });

  it('matches an ID against the start of the code or the National ID, in one query', async () => {
    graphqlFetch.mockResolvedValue(page([]));
    await findPatients('store', terms({ lastName: 'Smith', id: ' AB1 ' }), 50);
    expect(graphqlFetch).toHaveBeenCalledTimes(1);
    expect(calls()[0]).toMatchObject({
      filter: {
        lastName: { startsWith: 'Smith' },
        codeOrCode2: { startsWith: 'AB1' },
      },
      first: FIND_LIMIT + 1,
      offset: 50,
    });
  });

  it('is undefined when the one request fails', async () => {
    graphqlFetch.mockResolvedValue({ kind: 'unexpectedError' });
    expect(
      await findPatients('store', terms({ lastName: 'A' }))
    ).toBeUndefined();
  });
});

describe('OMS-REG-DIS-01.67 — a page of results says whether there is a next', () => {
  it('has more when the extra row comes back, and leaves it off the page', async () => {
    graphqlFetch.mockResolvedValue(page(rows(FIND_LIMIT + 1)));
    const result = await findPatients('store', terms({ lastName: 'N' }));
    expect(result?.rows).toHaveLength(FIND_LIMIT);
    expect(result?.more).toBe(true);
  });

  it('has no more when a full page comes back without the extra row', async () => {
    graphqlFetch.mockResolvedValue(page(rows(FIND_LIMIT)));
    const result = await findPatients('store', terms({ lastName: 'N' }));
    expect(result?.rows).toHaveLength(FIND_LIMIT);
    expect(result?.more).toBe(false);
  });
});

describe('hasTerms — the search lists nothing until a field is filled in (.56)', () => {
  it('is false for blank fields', () => {
    expect(hasTerms(terms({ lastName: '  ', firstName: ' ', id: ' ' }))).toBe(
      false
    );
  });

  it('is true for any one field, a date of birth included', () => {
    expect(hasTerms(terms({ id: 'A' }))).toBe(true);
    expect(
      hasTerms(
        terms({ dob: { from: '1984-01-01', to: '1984-12-31', exact: false } })
      )
    ).toBe(true);
  });
});

const centralNode = (id: string, lastName: string, firstName: string) => ({
  id,
  code: id,
  code2: null,
  firstName,
  lastName,
  gender: null,
  dateOfBirth: null,
  isDeceased: false,
});

describe('OMS-REG-DIS-01.57 — other facilities are searched for the same terms', () => {
  it('passes a full date of birth as the exact date', async () => {
    searchCentralPatients.mockResolvedValue({ kind: 'ok', nodes: [] });
    await findCentralPatients(
      'store',
      terms({
        lastName: ' Smith ',
        id: 'AB',
        dob: { from: '1984-03-14', to: '1984-03-14', exact: true },
      }),
      50
    );
    expect(searchCentralPatients).toHaveBeenCalledWith('store', {
      lastName: 'Smith',
      firstName: null,
      code: 'AB',
      dateOfBirth: '1984-03-14',
      dateOfBirthFrom: null,
      dateOfBirthTo: null,
      first: FIND_LIMIT + 1,
      offset: 50,
    });
  });

  it('passes a year or month as a from–to range', async () => {
    searchCentralPatients.mockResolvedValue({ kind: 'ok', nodes: [] });
    await findCentralPatients(
      'store',
      terms({ dob: { from: '1984-03-01', to: '1984-03-31', exact: false } })
    );
    expect(searchCentralPatients.mock.calls[0][1]).toMatchObject({
      dateOfBirth: null,
      dateOfBirthFrom: '1984-03-01',
      dateOfBirthTo: '1984-03-31',
      lastName: null,
      code: null,
      offset: 0,
    });
  });

  it('names each row "Last, First", with the address and phone central sends (.81)', async () => {
    searchCentralPatients.mockResolvedValue({
      kind: 'ok',
      nodes: [
        {
          ...centralNode('c1', 'Smith', 'Jo'),
          address1: '1 Main St',
          phone: '555',
        },
        centralNode('c2', 'Brown', ''),
      ],
    });
    const result = await findCentralPatients('store', terms({ lastName: 'S' }));
    expect(result).toEqual({
      kind: 'ok',
      more: false,
      rows: [
        expect.objectContaining({
          id: 'c1',
          name: 'Smith, Jo',
          address1: '1 Main St',
          phone: '555',
        }),
        // An older central sends neither.
        expect.objectContaining({
          id: 'c2',
          name: 'Brown',
          address1: null,
          phone: null,
        }),
      ],
    });
  });

  it('has more when the extra row comes back', async () => {
    searchCentralPatients.mockResolvedValue({
      kind: 'ok',
      nodes: Array.from({ length: FIND_LIMIT + 1 }, (_, i) =>
        centralNode(`c${i}`, 'Smith', 'Jo')
      ),
    });
    const result = await findCentralPatients('store', terms({ lastName: 'S' }));
    expect(result.kind === 'ok' && result.rows).toHaveLength(FIND_LIMIT);
    expect(result.kind === 'ok' && result.more).toBe(true);
  });

  it('passes an unreachable or failed central search through', async () => {
    searchCentralPatients.mockResolvedValueOnce({
      kind: 'unreachable',
      message: 'down',
    });
    expect(
      await findCentralPatients('store', terms({ lastName: 'S' }))
    ).toEqual({ kind: 'unreachable', message: 'down' });
    searchCentralPatients.mockResolvedValueOnce({ kind: 'failed' });
    expect(
      await findCentralPatients('store', terms({ lastName: 'S' }))
    ).toEqual({ kind: 'failed' });
  });
});

describe('recentPatients — the patients of the latest prescriptions', () => {
  const invoices = (patients: (PatientFindRow | null)[]) => ({
    kind: 'success',
    data: {
      invoices: {
        __typename: 'InvoiceConnector',
        nodes: patients.map((patient, i) => ({ id: `inv${i}`, patient })),
      },
    },
  });

  it('lists each patient once, newest first, up to the count', async () => {
    const [a, b, c] = [row('a', 'A'), row('b', 'B'), row('c', 'C')];
    graphqlFetch.mockResolvedValue(invoices([a, a, null, b, a, c]));
    expect((await recentPatients('store', 2)).map(r => r.id)).toEqual([
      'a',
      'b',
    ]);
    expect(graphqlFetch.mock.calls[0][1]).toEqual({
      storeId: 'store',
      first: 8,
    });
  });

  it('is empty when the request fails', async () => {
    graphqlFetch.mockResolvedValue({ kind: 'unexpectedError' });
    expect(await recentPatients('store', 10)).toEqual([]);
  });
});

describe('fold and namesKey — names compared without case or accents', () => {
  it('folds accents, case and outer spaces', () => {
    expect(fold('  Ismaël ÉLODIE ')).toBe('ismael elodie');
  });

  it('keys two names the same whatever their accents or case', () => {
    expect(namesKey('Élodie', 'Ismaël')).toBe(namesKey(' elodie', 'ISMAEL '));
    expect(namesKey('Jo', 'Smith')).not.toBe(namesKey('Smith', 'Jo'));
  });
});
