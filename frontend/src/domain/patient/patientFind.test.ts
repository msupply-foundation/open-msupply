import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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
let central = false;
vi.mock('../../api/serverInfo', () => ({ isCentralServer: () => central }));
const searchCentralPatients = vi.fn();
vi.mock('./patientResource', () => ({
  searchCentralPatients: (...args: unknown[]) => searchCentralPatients(...args),
}));

import {
  FIND_LIMIT,
  findOtherFacilityPatients,
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
  central = false;
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
      filter: { lastName: { startsWith: 'Smi' }, isVisible: true },
      first: FIND_LIMIT + 1,
      offset: 100,
    });
  });

  it('filters on each name given, and leaves out the blank ones', async () => {
    graphqlFetch.mockResolvedValue(page([]));
    await findPatients('store', terms({ lastName: 'Smith', firstName: '  ' }));
    expect(calls()[0].filter).toEqual({
      lastName: { startsWith: 'Smith' },
      isVisible: true,
    });
  });

  it('matches a full date of birth exactly', async () => {
    graphqlFetch.mockResolvedValue(page([]));
    await findPatients(
      'store',
      terms({ dob: { from: '1984-03-14', to: '1984-03-14', exact: true } })
    );
    expect(calls()[0].filter).toEqual({
      dateOfBirth: { equalTo: '1984-03-14' },
      isVisible: true,
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
      isVisible: true,
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

describe("OMS-REG-DIS-01.83 — results here are this store's patients", () => {
  it('asks only for the patients visible in this store', async () => {
    graphqlFetch.mockResolvedValue(page([]));
    await findPatients('store', terms({ lastName: 'Smith' }));
    expect(calls()[0].filter).toMatchObject({ isVisible: true });
  });
});

describe('OMS-REG-DIS-01.84 — on the central server, other facilities are its own other patients', () => {
  it('asks the central server itself for patients not visible in this store', async () => {
    central = true;
    graphqlFetch.mockResolvedValue(page(rows(FIND_LIMIT + 1)));
    const result = await findOtherFacilityPatients(
      'store',
      terms({ lastName: ' Smith ', id: 'AB' }),
      { offset: 50 }
    );
    expect(searchCentralPatients).not.toHaveBeenCalled();
    expect(graphqlFetch.mock.calls[0][0]).toBe(PatientFind);
    expect(calls()[0]).toEqual({
      storeId: 'store',
      filter: {
        lastName: { startsWith: 'Smith' },
        codeOrCode2: { startsWith: 'AB' },
        isVisible: false,
      },
      first: FIND_LIMIT + 1,
      offset: 50,
    });
    expect(result).toMatchObject({ kind: 'ok', more: true });
    expect(result.kind === 'ok' && result.rows).toHaveLength(FIND_LIMIT);
  });

  it('reads a failed request as failed, never as out of reach', async () => {
    central = true;
    graphqlFetch.mockResolvedValue({ kind: 'error' });
    expect(
      await findOtherFacilityPatients('store', terms({ lastName: 'S' }))
    ).toEqual({ kind: 'failed' });
  });
});

describe('OMS-REG-DIS-01.57 — other facilities are searched for the same terms', () => {
  // This site's own patients at other stores: none, unless a test says
  beforeEach(() => {
    graphqlFetch.mockResolvedValue(page([]));
  });

  it('passes a full date of birth as the exact date', async () => {
    searchCentralPatients.mockResolvedValue({ kind: 'ok', nodes: [] });
    await findOtherFacilityPatients(
      'store',
      terms({
        lastName: ' Smith ',
        id: 'AB',
        dob: { from: '1984-03-14', to: '1984-03-14', exact: true },
      }),
      { offset: 50 }
    );
    expect(searchCentralPatients).toHaveBeenCalledWith('store', {
      lastName: 'Smith',
      firstName: null,
      code: 'AB',
      dateOfBirth: '1984-03-14',
      dateOfBirthFrom: null,
      dateOfBirthTo: null,
      // From the row before the page, to place site patients between pages
      first: FIND_LIMIT + 2,
      offset: 49,
    });
  });

  it('passes a year or month as a from–to range', async () => {
    searchCentralPatients.mockResolvedValue({ kind: 'ok', nodes: [] });
    await findOtherFacilityPatients(
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
    const result = await findOtherFacilityPatients(
      'store',
      terms({ lastName: 'S' })
    );
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
    const result = await findOtherFacilityPatients(
      'store',
      terms({ lastName: 'S' })
    );
    expect(result.kind === 'ok' && result.rows).toHaveLength(FIND_LIMIT);
    expect(result.kind === 'ok' && result.more).toBe(true);
  });

  it('passes an unreachable or failed central search through', async () => {
    searchCentralPatients.mockResolvedValueOnce({
      kind: 'unreachable',
      message: 'down',
    });
    expect(
      await findOtherFacilityPatients('store', terms({ lastName: 'S' }))
    ).toEqual({ kind: 'unreachable', site: { rows: [], more: false } });
    searchCentralPatients.mockResolvedValueOnce({ kind: 'failed' });
    expect(
      await findOtherFacilityPatients('store', terms({ lastName: 'S' }))
    ).toEqual({ kind: 'failed' });
  });
});

describe("OMS-REG-DIS-01.85 — on a remote site, this site's patients at other stores are listed with central's", () => {
  const siteRow = (id: string, name: string) => row(id, name);
  const centralPage = (names: [string, string][], more = false) => ({
    kind: 'ok',
    nodes: [
      ...names.map(([id, last]) => centralNode(id, last, '')),
      ...(more ? [centralNode('extra', 'Zz', '')] : []),
    ],
  });

  it('asks for the site patients not visible here, beside central', async () => {
    graphqlFetch.mockResolvedValue(page([]));
    searchCentralPatients.mockResolvedValue(centralPage([]));
    await findOtherFacilityPatients('store', terms({ lastName: 'S' }), {
      offset: 50,
    });
    // Read at once (few on a remote site), each page taking its share
    expect(calls()[0]).toEqual({
      storeId: 'store',
      filter: { lastName: { startsWith: 'S' }, isVisible: false },
      first: 1000,
      offset: 0,
    });
    expect(searchCentralPatients).toHaveBeenCalledOnce();
  });

  it("adds those central doesn't have yet, in name order, once each", async () => {
    graphqlFetch.mockResolvedValue(
      page([siteRow('c1', 'Adams'), siteRow('s1', 'Brown')])
    );
    searchCentralPatients.mockResolvedValue(
      centralPage([
        ['c1', 'Adams'],
        ['c2', 'Cole'],
      ])
    );
    const result = await findOtherFacilityPatients(
      'store',
      terms({ lastName: 'S' })
    );
    expect(result.kind === 'ok' && result.rows.map(r => r.id)).toEqual([
      'c1',
      's1',
      'c2',
    ]);
  });

  // A page of central rows A000.. from `from`, with one more when `more`
  const centralFrom = (from: number, count: number, more: boolean) =>
    centralPage(
      Array.from({ length: count }, (_, i): [string, string] => [
        `c${from + i}`,
        `A${String(from + i).padStart(3, '0')}`,
      ]),
      more
    );

  it("leaves one that sorts after central's page to the page it falls on", async () => {
    graphqlFetch.mockResolvedValue(page([siteRow('s1', 'A060x')]));
    searchCentralPatients.mockResolvedValueOnce(
      centralFrom(0, FIND_LIMIT, true)
    );
    const first = await findOtherFacilityPatients(
      'store',
      terms({ lastName: 'S' })
    );
    expect(first.kind === 'ok' && first.rows.map(r => r.id)).not.toContain(
      's1'
    );

    // Page 2: central from the row before it (A049), A050..A099 and more
    searchCentralPatients.mockResolvedValueOnce(
      centralFrom(FIND_LIMIT - 1, FIND_LIMIT + 1, true)
    );
    const second = await findOtherFacilityPatients(
      'store',
      terms({ lastName: 'S' }),
      { offset: FIND_LIMIT }
    );
    const ids = second.kind === 'ok' ? second.rows.map(r => r.id) : [];
    expect(ids).toContain('s1');
    expect(ids.indexOf('s1')).toBe(ids.indexOf('c60') + 1);
    expect(ids).not.toContain(`c${FIND_LIMIT - 1}`);
  });

  it('puts one falling between two pages on the later page, once', async () => {
    // Between page 1's last (A049) and page 2's first (A050)
    graphqlFetch.mockResolvedValue(page([siteRow('s1', 'A049x')]));
    searchCentralPatients.mockResolvedValueOnce(
      centralFrom(0, FIND_LIMIT, true)
    );
    const first = await findOtherFacilityPatients(
      'store',
      terms({ lastName: 'S' })
    );
    expect(first.kind === 'ok' && first.rows.map(r => r.id)).not.toContain(
      's1'
    );
    searchCentralPatients.mockResolvedValueOnce(
      centralFrom(FIND_LIMIT - 1, 3, false)
    );
    const second = await findOtherFacilityPatients(
      'store',
      terms({ lastName: 'S' }),
      { offset: FIND_LIMIT }
    );
    expect(second.kind === 'ok' && second.rows.map(r => r.id)).toEqual([
      's1',
      'c50',
      'c51',
    ]);
  });

  it("leaves one before the page's first row to the earlier page", async () => {
    graphqlFetch.mockResolvedValue(page([siteRow('s1', 'Aaron')]));
    searchCentralPatients.mockResolvedValue(
      centralPage([
        ['c49', 'Adams'],
        ['c50', 'Cole'],
      ])
    );
    const result = await findOtherFacilityPatients(
      'store',
      terms({ lastName: 'S' }),
      { offset: 50 }
    );
    expect(result.kind === 'ok' && result.rows.map(r => r.id)).toEqual(['c50']);
  });

  it('pages them by themselves when central is out of reach', async () => {
    graphqlFetch.mockResolvedValue(page(rows(FIND_LIMIT + 2, 's').map(r => r)));
    searchCentralPatients.mockResolvedValue({ kind: 'unreachable' });
    const result = await findOtherFacilityPatients(
      'store',
      terms({ lastName: 'S' }),
      { offset: FIND_LIMIT }
    );
    expect(result).toEqual({
      kind: 'unreachable',
      site: { rows: rows(FIND_LIMIT + 2, 's').slice(FIND_LIMIT), more: false },
    });
  });

  it('hands them over as soon as they are found, before central answers', async () => {
    graphqlFetch.mockResolvedValue(page([siteRow('s1', 'Brown')]));
    let answer: (value: unknown) => void = () => {};
    searchCentralPatients.mockReturnValue(
      new Promise(resolve => (answer = resolve))
    );
    const early = vi.fn();
    const result = findOtherFacilityPatients(
      'store',
      terms({ lastName: 'S' }),
      {
        onSite: early,
      }
    );
    await vi.waitFor(() => expect(early).toHaveBeenCalledOnce());
    expect(early).toHaveBeenCalledWith({
      rows: [siteRow('s1', 'Brown')],
      more: false,
    });
    answer(centralPage([['c1', 'Adams']]));
    expect((await result).kind).toBe('ok');
  });

  it('hands nothing over early for a later page', async () => {
    graphqlFetch.mockResolvedValue(page([siteRow('s1', 'Brown')]));
    searchCentralPatients.mockResolvedValue(centralPage([['c9', 'Cole']]));
    const early = vi.fn();
    await findOtherFacilityPatients('store', terms({ lastName: 'S' }), {
      offset: 50,
      onSite: early,
    });
    expect(early).not.toHaveBeenCalled();
  });

  it('keeps them when central is out of reach or too slow', async () => {
    graphqlFetch.mockResolvedValue(page([siteRow('s1', 'Brown')]));
    for (const kind of ['unreachable', 'slow'] as const) {
      searchCentralPatients.mockResolvedValueOnce({ kind, message: 'down' });
      expect(
        await findOtherFacilityPatients('store', terms({ lastName: 'S' }))
      ).toEqual({
        kind,
        site: { rows: [siteRow('s1', 'Brown')], more: false },
      });
    }
  });

  it('asks only this site when central was out of reach moments ago', async () => {
    graphqlFetch.mockResolvedValue(page([siteRow('s1', 'Brown')]));
    expect(
      await findOtherFacilityPatients('store', terms({ lastName: 'S' }), {
        skipCentral: true,
      })
    ).toEqual({
      kind: 'unreachable',
      site: { rows: [siteRow('s1', 'Brown')], more: false },
    });
    expect(searchCentralPatients).not.toHaveBeenCalled();
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
