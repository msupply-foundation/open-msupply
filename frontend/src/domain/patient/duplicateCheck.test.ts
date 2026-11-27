import { createRoot } from 'solid-js';
import { afterEach, describe, expect, it, vi } from 'vitest';

/*
 * The create form's duplicate check (spec/patients S2 › the duplicate check;
 * cases OMS-REG-DIS-01 `.62`–`.64`, `.72`, `.76`). The two searches it
 * asks — this store's and other facilities' — are mocked, each answering when
 * the test
 * says so; the keying, merging and ordering run for real.
 */

let central = false;
vi.mock('../../api/serverInfo', () => ({ isCentralServer: () => central }));

const findPatients = vi.fn();
const findOtherFacilityPatients = vi.fn();
vi.mock('./patientFind', async importOriginal => ({
  ...(await importOriginal<typeof import('./patientFind')>()),
  findPatients: (...args: unknown[]) => findPatients(...args),
  findOtherFacilityPatients: (...args: unknown[]) =>
    findOtherFacilityPatients(...args),
}));

import { createDuplicateCheck, type DuplicateTerms } from './duplicateCheck';
import type {
  CentralFind,
  FindResult,
  OtherFacilityOptions,
  PatientFindRow,
} from './patientFind';

let dispose: (() => void) | undefined;
afterEach(() => {
  dispose?.();
  dispose = undefined;
  central = false;
  findPatients.mockReset();
  findOtherFacilityPatients.mockReset();
});

const row = (
  id: string,
  more: Partial<PatientFindRow> = {}
): PatientFindRow => ({
  id,
  code: id,
  code2: null,
  name: `Smith, ${id}`,
  firstName: id,
  lastName: 'Smith',
  gender: null,
  dateOfBirth: null,
  isDeceased: false,
  address1: null,
  ...more,
});

/** A reply the test settles when it chooses. */
const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(r => (resolve = r));
  return { promise, resolve };
};

const here = (rows: PatientFindRow[]): FindResult => ({ rows, more: false });
const ok = (rows: PatientFindRow[]): CentralFind => ({
  kind: 'ok',
  rows,
  more: false,
});

const mount = (initial: Partial<DuplicateTerms>) => {
  let terms: DuplicateTerms = {
    firstName: '',
    lastName: '',
    dateOfBirth: null,
    code2: '',
    ...initial,
  };
  const check = createRoot(d => {
    dispose = d;
    return createDuplicateCheck({
      storeId: () => 'store',
      terms: () => terms,
    });
  });
  const setTerms = (more: Partial<DuplicateTerms>) => {
    terms = { ...terms, ...more };
  };
  return { check, setTerms };
};

const done = (check: ReturnType<typeof mount>['check']) => {
  const state = check.state();
  return state.status === 'done' ? state : undefined;
};

describe('OMS-REG-DIS-01.62 — the check runs once both names have two letters', () => {
  it('stays off while either name has fewer than two letters', async () => {
    const { check } = mount({ firstName: 'J', lastName: 'Smith' });
    await check.run();
    expect(check.state()).toEqual({ status: 'off' });
    expect(findPatients).not.toHaveBeenCalled();
  });

  it('counts letters without accents or outer spaces', async () => {
    const { check } = mount({ firstName: ' é ', lastName: 'Smith' });
    await check.run();
    expect(check.state()).toEqual({ status: 'off' });
  });

  it('searches both names, with no ID, here and at other facilities', async () => {
    findPatients.mockResolvedValue(here([]));
    findOtherFacilityPatients.mockResolvedValue(ok([]));
    const { check } = mount({ firstName: 'Jo', lastName: 'Smith' });
    await check.run();
    const nameTerms = { firstName: 'Jo', lastName: 'Smith', id: '' };
    expect(findPatients).toHaveBeenCalledWith('store', nameTerms);
    expect(findOtherFacilityPatients).toHaveBeenCalledWith(
      'store',
      nameTerms,
      expect.anything()
    );
  });

  it('goes back off when a name drops below two letters', async () => {
    findPatients.mockResolvedValue(here([row('a')]));
    findOtherFacilityPatients.mockResolvedValue(ok([]));
    const { check, setTerms } = mount({ firstName: 'Jo', lastName: 'Smith' });
    await check.run();
    expect(check.state().status).toBe('done');
    setTerms({ firstName: 'J' });
    await check.run();
    expect(check.state()).toEqual({ status: 'off' });
  });
});

describe('OMS-REG-DIS-01.62 — leaving a field re-checks only when what it checks changed', () => {
  it('does not run again for the same names with other case or accents', async () => {
    findPatients.mockResolvedValue(here([]));
    findOtherFacilityPatients.mockResolvedValue(ok([]));
    const { check, setTerms } = mount({
      firstName: 'Élodie',
      lastName: 'Ismaël',
    });
    await check.run();
    setTerms({ firstName: 'elodie ', lastName: 'ISMAEL' });
    await check.run();
    expect(findPatients).toHaveBeenCalledOnce();
  });

  it('does not run again for another date in the same birth year', async () => {
    findPatients.mockResolvedValue(here([]));
    findOtherFacilityPatients.mockResolvedValue(ok([]));
    const { check, setTerms } = mount({
      firstName: 'Jo',
      lastName: 'Smith',
      dateOfBirth: '1984-03-14',
    });
    await check.run();
    setTerms({ dateOfBirth: '1984-11-02' });
    await check.run();
    expect(findPatients).toHaveBeenCalledOnce();
  });

  it('runs again when the birth year or Code 2 changes', async () => {
    findPatients.mockResolvedValue(here([]));
    findOtherFacilityPatients.mockResolvedValue(ok([]));
    const { check, setTerms } = mount({
      firstName: 'Jo',
      lastName: 'Smith',
      dateOfBirth: '1984-03-14',
    });
    await check.run();
    setTerms({ dateOfBirth: '1985-03-14' });
    await check.run();
    setTerms({ code2: 'N-1' });
    await check.run();
    // The Code 2 is folded: only its case changed.
    setTerms({ code2: 'n-1' });
    await check.run();
    expect(findPatients).toHaveBeenCalledTimes(3);
  });

  it('runs again for the same key when forced (Retry)', async () => {
    findPatients.mockResolvedValue(here([]));
    findOtherFacilityPatients.mockResolvedValue(ok([]));
    const { check } = mount({ firstName: 'Jo', lastName: 'Smith' });
    await check.run();
    await check.retry();
    expect(findPatients).toHaveBeenCalledTimes(2);
  });
});

describe('OMS-REG-DIS-01.72 / .63 — this store answers first, other facilities follow', () => {
  it('reads checking, then this store’s matches with other facilities pending, then both', async () => {
    const local = deferred<FindResult>();
    const remote = deferred<CentralFind>();
    findPatients.mockReturnValue(local.promise);
    findOtherFacilityPatients.mockReturnValue(remote.promise);
    const { check } = mount({ firstName: 'Jo', lastName: 'Smith' });

    const running = check.run();
    expect(check.state()).toEqual({ status: 'checking' });

    local.resolve(here([row('a')]));
    await vi.waitFor(() => expect(done(check)?.central).toBe('pending'));
    expect(done(check)?.matches.map(m => [m.id, m.where])).toEqual([
      ['a', 'here'],
    ]);

    // One of central's is already here: listed once, as here.
    remote.resolve(ok([row('a'), row('b')]));
    await running;
    expect(done(check)?.central).toBe('done');
    expect(done(check)?.matches.map(m => [m.id, m.where])).toEqual([
      ['a', 'here'],
      ['b', 'elsewhere'],
    ]);
  });

  it('marks other facilities failed when central is out of reach, keeping this store’s', async () => {
    findPatients.mockResolvedValue(here([row('a')]));
    findOtherFacilityPatients.mockResolvedValue({ kind: 'unreachable' });
    const { check } = mount({ firstName: 'Jo', lastName: 'Smith' });
    await check.run();
    expect(done(check)?.central).toBe('failed');
    expect(done(check)?.matches.map(m => m.id)).toEqual(['a']);
  });

  // OMS-REG-DIS-01.85
  it("lists this site's patients at other stores while central is still checked", async () => {
    findPatients.mockResolvedValue(here([row('a')]));
    const remote = deferred<CentralFind>();
    findOtherFacilityPatients.mockImplementation(
      (_store: string, _terms: unknown, options: OtherFacilityOptions) => {
        options.onSite?.({ rows: [row('s1')], more: false });
        return remote.promise;
      }
    );
    const { check } = mount({ firstName: 'Jo', lastName: 'Smith' });
    const running = check.run();
    await vi.waitFor(() => expect(done(check)?.central).toBe('pending'));
    expect(done(check)?.matches.map(m => [m.id, m.where])).toEqual([
      ['a', 'here'],
      ['s1', 'elsewhere'],
    ]);
    remote.resolve(ok([row('c1'), row('s1')]));
    await running;
    expect(done(check)?.central).toBe('done');
    expect(done(check)?.matches.map(m => m.id)).toEqual(['a', 'c1', 's1']);
  });

  // OMS-REG-DIS-01.85
  it("still counts this site's patients at other stores when central is out of reach", async () => {
    findPatients.mockResolvedValue(here([row('a')]));
    findOtherFacilityPatients.mockResolvedValue({
      kind: 'slow',
      site: { rows: [row('s1')], more: false },
    });
    const { check } = mount({ firstName: 'Jo', lastName: 'Smith' });
    await check.run();
    expect(done(check)?.central).toBe('failed');
    expect(done(check)?.matches.map(m => [m.id, m.where])).toEqual([
      ['a', 'here'],
      ['s1', 'elsewhere'],
    ]);
  });

  it("keeps this site's patients at other stores when the central request fails outright", async () => {
    findPatients.mockResolvedValue(here([]));
    findOtherFacilityPatients.mockImplementation(
      async (
        _store: string,
        _terms: unknown,
        options: OtherFacilityOptions
      ) => {
        options.onSite?.({ rows: [row('s1')], more: false });
        return { kind: 'failed' };
      }
    );
    const { check } = mount({ firstName: 'Jo', lastName: 'Smith' });
    await check.run();
    expect(done(check)?.central).toBe('failed');
    expect(done(check)?.matches.map(m => m.id)).toEqual(['s1']);
  });

  // The failure itself is reported globally; the footer mustn't then claim
  // there are no existing patients.
  it('marks other facilities failed when the central request fails outright', async () => {
    findPatients.mockResolvedValue(here([]));
    findOtherFacilityPatients.mockResolvedValue({ kind: 'failed' });
    const { check } = mount({ firstName: 'Jo', lastName: 'Smith' });
    await check.run();
    expect(done(check)).toEqual({
      status: 'done',
      matches: [],
      more: false,
      central: 'failed',
    });
  });

  it('fails, rather than finding no one, when this store’s request fails', async () => {
    findPatients.mockResolvedValue(undefined);
    findOtherFacilityPatients.mockResolvedValue(ok([]));
    const { check } = mount({ firstName: 'Jo', lastName: 'Smith' });
    await check.run();
    expect(check.state()).toEqual({ status: 'failed' });
  });

  it('fails on the central server too, where this store is the only place asked', async () => {
    central = true;
    findPatients.mockResolvedValue(undefined);
    const { check } = mount({ firstName: 'Jo', lastName: 'Smith' });
    await check.run();
    expect(check.state()).toEqual({ status: 'failed' });
  });

  it('checks again on Retry after this store failed', async () => {
    findPatients.mockResolvedValueOnce(undefined);
    findOtherFacilityPatients.mockResolvedValue(ok([]));
    const { check } = mount({ firstName: 'Jo', lastName: 'Smith' });
    await check.run();
    findPatients.mockResolvedValueOnce(here([row('a')]));
    await check.retry();
    expect(done(check)?.matches.map(m => m.id)).toEqual(['a']);
  });
});

describe('the count past the first page', () => {
  it('says there are more when this store has more than a page', async () => {
    findPatients.mockResolvedValue({ rows: [row('a')], more: true });
    findOtherFacilityPatients.mockResolvedValue(ok([]));
    const { check } = mount({ firstName: 'Jo', lastName: 'Smith' });
    await check.run();
    expect(done(check)?.more).toBe(true);
  });

  it('says there are more when other facilities have more than a page', async () => {
    findPatients.mockResolvedValue(here([]));
    findOtherFacilityPatients.mockResolvedValue({
      kind: 'ok',
      rows: [row('c1')],
      more: true,
    });
    const { check } = mount({ firstName: 'Jo', lastName: 'Smith' });
    await check.run();
    expect(done(check)?.more).toBe(true);
  });
});

describe('OMS-REG-DIS-01.84 — on the central server, other facilities are checked too', () => {
  it('asks for other facilities as on a remote site', async () => {
    central = true;
    findPatients.mockResolvedValue(here([row('a')]));
    findOtherFacilityPatients.mockResolvedValue(ok([row('b')]));
    const { check } = mount({ firstName: 'Jo', lastName: 'Smith' });
    await check.run();
    expect(findOtherFacilityPatients).toHaveBeenCalledOnce();
    expect(done(check)?.central).toBe('done');
    expect(done(check)?.matches.map(m => [m.id, m.where])).toEqual([
      ['a', 'here'],
      ['b', 'elsewhere'],
    ]);
  });
});

describe('OMS-REG-DIS-01.64 / .76 — likely matches first and marked (Code 2 still counts)', () => {
  it('marks a same birth year and a same Code 2, and lists likely ones first', async () => {
    findPatients.mockResolvedValue(
      here([
        row('name-only', { dateOfBirth: '1990-01-01' }),
        row('year', { dateOfBirth: '1984-07-01' }),
        row('both', { dateOfBirth: '1984-01-01', code2: ' N-1 ' }),
      ])
    );
    findOtherFacilityPatients.mockResolvedValue(
      ok([row('id-elsewhere', { code2: 'n-1' })])
    );
    const { check } = mount({
      firstName: 'Jo',
      lastName: 'Smith',
      dateOfBirth: '1984-03-14',
      code2: 'N-1',
    });
    await check.run();
    expect(done(check)?.matches.map(m => [m.id, m.likely])).toEqual([
      ['both', ['birth-year', 'code2']],
      ['year', ['birth-year']],
      ['id-elsewhere', ['code2']],
      ['name-only', []],
    ]);
  });

  it('marks nothing likely when no birth date or Code 2 is entered', async () => {
    findPatients.mockResolvedValue(
      here([row('a', { dateOfBirth: '1984-01-01', code2: '' })])
    );
    findOtherFacilityPatients.mockResolvedValue(ok([]));
    const { check } = mount({ firstName: 'Jo', lastName: 'Smith' });
    await check.run();
    expect(done(check)?.matches[0].likely).toEqual([]);
  });
});

describe('a reply for a check that has been superseded is dropped', () => {
  it('drops this store’s reply when the check was reset meanwhile', async () => {
    const local = deferred<FindResult>();
    findPatients.mockReturnValue(local.promise);
    findOtherFacilityPatients.mockResolvedValue(ok([]));
    const { check } = mount({ firstName: 'Jo', lastName: 'Smith' });
    const running = check.run();
    check.reset();
    local.resolve(here([row('a')]));
    await running;
    expect(check.state()).toEqual({ status: 'off' });
  });

  it('drops central’s reply when the check was reset meanwhile', async () => {
    const remote = deferred<CentralFind>();
    findPatients.mockResolvedValue(here([]));
    findOtherFacilityPatients.mockReturnValue(remote.promise);
    const { check } = mount({ firstName: 'Jo', lastName: 'Smith' });
    const running = check.run();
    await vi.waitFor(() => expect(done(check)?.central).toBe('pending'));
    check.reset();
    remote.resolve(ok([row('b')]));
    await running;
    expect(check.state()).toEqual({ status: 'off' });
  });

  it('drops an older run’s replies once a newer one has started', async () => {
    const firstLocal = deferred<FindResult>();
    const firstRemote = deferred<CentralFind>();
    findPatients
      .mockReturnValueOnce(firstLocal.promise)
      .mockResolvedValueOnce(here([row('new')]));
    findOtherFacilityPatients
      .mockReturnValueOnce(firstRemote.promise)
      .mockResolvedValueOnce(ok([]));
    const { check, setTerms } = mount({ firstName: 'Jo', lastName: 'Smith' });
    const older = check.run();
    setTerms({ firstName: 'Joan' });
    await check.run();
    firstLocal.resolve(here([row('old')]));
    firstRemote.resolve(ok([row('old-elsewhere')]));
    await older;
    expect(done(check)?.matches.map(m => m.id)).toEqual(['new']);
  });

  it('runs again after a reset, even for the same names', async () => {
    findPatients.mockResolvedValue(here([]));
    findOtherFacilityPatients.mockResolvedValue(ok([]));
    const { check } = mount({ firstName: 'Jo', lastName: 'Smith' });
    await check.run();
    check.reset();
    await check.run();
    expect(findPatients).toHaveBeenCalledTimes(2);
  });
});
