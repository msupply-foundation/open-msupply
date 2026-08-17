import { describe, expect, it } from 'vitest';
import {
  EMPTY_FORM,
  buildUpsertInput,
  formFromSite,
  isFormValid,
  proposedSiteId,
  reassignmentTarget,
  siteDeletable,
  storeDraftChange,
  storeRemovalAllowed,
  upsertRejection,
  type SiteRow,
  type SiteStore,
} from './siteEdit';

// Anchors: spec/sites/cases/OMS-FUN-SYC-002 (behaviours cited per describe).

const site = (over: Partial<SiteRow> = {}): SiteRow => ({
  __typename: 'SiteNode',
  id: 4,
  code: 's4',
  name: 'Site four',
  hardwareId: 'HW-1',
  syncVersion: 'V7',
  appVersion: '3.0.0',
  lastConnectionDatetime: '2026-08-06T05:13:46',
  lastSyncDatetime: '2026-08-06T05:13:47',
  isMultiDevice: false,
  ...over,
});

const store = (id: string, code = id): SiteStore => ({
  __typename: 'StoreNode',
  id,
  code,
  storeName: `Store ${id}`,
  siteId: 4,
});

describe('OMS-FUN-SYC-002.16 — creating a site with no code, no name or no password is refused, naming the missing field', () => {
  it('holds Save disabled until all three are filled on a create', () => {
    expect(isFormValid(EMPTY_FORM, 'create')).toBe(false);
    expect(isFormValid({ code: 'c', name: '', password: 'p' }, 'create')).toBe(
      false
    );
    expect(isFormValid({ code: '', name: 'n', password: 'p' }, 'create')).toBe(
      false
    );
    expect(isFormValid({ code: 'c', name: 'n', password: '' }, 'create')).toBe(
      false
    );
    expect(isFormValid({ code: 'c', name: 'n', password: 'p' }, 'create')).toBe(
      true
    );
  });

  it('names the missing field when the server rejects one anyway', () => {
    expect(
      upsertRejection({ __typename: 'CodeRequired', description: 'x' })
    ).toEqual({ kind: 'fieldRequired', field: 'code' });
    expect(
      upsertRejection({ __typename: 'NameRequired', description: 'x' })
    ).toEqual({ kind: 'fieldRequired', field: 'name' });
    expect(
      upsertRejection({ __typename: 'PasswordRequired', description: 'x' })
    ).toEqual({ kind: 'fieldRequired', field: 'password' });
  });
});

describe('OMS-FUN-SYC-002.17 — a name already held by another site is refused as a duplicate', () => {
  it('falls through to the generic save message: no mapped copy exists for it', () => {
    expect(
      upsertRejection({
        __typename: 'UniqueValueViolation',
        field: 'name',
        description: 'name already used',
      })
    ).toEqual({ kind: 'other', description: 'name already used' });
  });
});

describe('OMS-FUN-SYC-002.18 — re-saving a site without changing its name is accepted', () => {
  it('sends the unchanged name, which the duplicate check exempts for the row being written', () => {
    const form = formFromSite(site({ name: 'Site four' }));
    expect(isFormValid(form, 'edit')).toBe(true);
    expect(buildUpsertInput(form, 4).name).toBe('Site four');
  });
});

describe('OMS-FUN-SYC-002.19 — on an existing site an empty code or password box leaves the stored value unchanged', () => {
  it('accepts both boxes empty on an edit', () => {
    expect(isFormValid({ code: '', name: 'n', password: '' }, 'edit')).toBe(
      true
    );
  });

  it('OMITS the field from the input rather than sending it empty', () => {
    const input = buildUpsertInput({ code: '', name: 'n', password: '' }, 4);
    expect(input).toEqual({
      id: 4,
      name: 'n',
      code: undefined,
      password: undefined,
    });
    // An absent optional is merged from the existing row server-side; an empty
    // string would be the CodeRequired / PasswordRequired rejection instead.
    expect(JSON.parse(JSON.stringify(input))).toEqual({ id: 4, name: 'n' });
  });
});

describe('OMS-FUN-SYC-002.20 — a whitespace-only code or password is refused', () => {
  it('holds Save disabled on an edit as well as a create', () => {
    expect(isFormValid({ code: '   ', name: 'n', password: '' }, 'edit')).toBe(
      false
    );
    expect(isFormValid({ code: '', name: 'n', password: '  ' }, 'edit')).toBe(
      false
    );
    expect(isFormValid({ code: ' ', name: 'n', password: 'p' }, 'create')).toBe(
      false
    );
  });

  it('refuses a whitespace-only name too — the name is required in both modes', () => {
    expect(isFormValid({ code: 'c', name: '  ', password: 'p' }, 'edit')).toBe(
      false
    );
  });

  it('trims what it does send, so a trailing space never reaches storage', () => {
    expect(
      buildUpsertInput({ code: ' c ', name: ' n ', password: ' p ' }, 4)
    ).toEqual({ id: 4, name: 'n', code: 'c', password: 'p' });
  });
});

describe('OMS-FUN-SYC-002.21 — a site password is never displayed: the field opens empty on every edit', () => {
  it('seeds the edit form with an empty password whatever the site holds', () => {
    expect(formFromSite(site()).password).toBe('');
    // There is no password field on SiteNode at all to seed it from.
    expect('password' in site()).toBe(false);
  });
});

describe('OMS-FUN-SYC-002.23 — a site id appears on none of the area screens and cannot be edited', () => {
  it('keeps the id out of the form state entirely', () => {
    expect(Object.keys(formFromSite(site()))).toEqual([
      'code',
      'name',
      'password',
    ]);
  });

  it('addresses the write by the id the row already carries, never by an input', () => {
    expect(buildUpsertInput(formFromSite(site({ id: 9 })), 9).id).toBe(9);
  });
});

describe('site identity — the client-proposed create id (rules.md § site identity, captured as-is)', () => {
  it('proposes one more than the highest LOADED id', () => {
    expect(proposedSiteId([{ id: 1 }, { id: 7 }, { id: 3 }])).toBe(8);
  });

  it('proposes 1 for an empty register', () => {
    expect(proposedSiteId([])).toBe(1);
  });

  it('can therefore collide beyond the first page — the upsert would rewrite that site', () => {
    // Page two of a name-sorted register can hold ids 2 and 3 while id 9 exists
    // on page one: the proposal is 4, which is not free. Recorded, not designed
    // around (README § captured as-is).
    expect(proposedSiteId([{ id: 2 }, { id: 3 }])).toBe(4);
  });
});

describe('OMS-FUN-SYC-002.32 — adding a store that already belongs to another site moves it to this site', () => {
  it('reports the added store as an assignment to this site', () => {
    const change = storeDraftChange([store('a')], [store('a'), store('b')]);
    expect(change).toEqual({ added: ['b'], removed: [] });
  });
});

describe('OMS-FUN-SYC-002.33 — removing a store from a site reassigns it to the central server site', () => {
  it('reports the removal, which the save expresses as an assignment elsewhere', () => {
    expect(storeDraftChange([store('a'), store('b')], [store('a')])).toEqual({
      added: [],
      removed: ['b'],
    });
  });

  it('sends the reassignment to the central server site id, falling back to 1', () => {
    expect(reassignmentTarget(5)).toBe(5);
    expect(reassignmentTarget(undefined)).toBe(1);
  });
});

describe('OMS-FUN-SYC-002.3 — an existing store association is not overridden when other site fields are edited', () => {
  it('produces NO assignment call at all when the draft is untouched', () => {
    const stores = [store('a'), store('b')];
    expect(storeDraftChange(stores, stores)).toEqual({
      added: [],
      removed: [],
    });
  });
});

describe('OMS-FUN-SYC-002.34 — the central server own site offers no store removal', () => {
  it('disallows removal on the central site and allows it elsewhere', () => {
    expect(storeRemovalAllowed(1, 1)).toBe(false);
    expect(storeRemovalAllowed(4, 1)).toBe(true);
  });

  it('uses the same fallback the reassignment does, so site 1 is protected with no sync settings', () => {
    expect(storeRemovalAllowed(1, undefined)).toBe(false);
  });
});

describe('OMS-FUN-SYC-002.37 / .38 — a site with any assigned store cannot be deleted; moving them off makes it deletable', () => {
  it('gates the editor delete affordance on the site showing no store', () => {
    expect(siteDeletable(2)).toBe(false);
    expect(siteDeletable(0)).toBe(true);
  });
});
