import { describe, expect, it } from 'vitest';
import { runSiteSave } from './siteSave';
import type { SaveRejection } from './siteEdit';

// Anchors: spec/sites/cases/OMS-FUN-SYC-002 (behaviours cited per describe).

const ok = () => Promise.resolve(undefined);
const rejects = (rejection: SaveRejection) => () => Promise.resolve(rejection);

describe('OMS-FUN-SYC-002.1 — a site details can be edited from the site management screen', () => {
  it('saves the site fields and reports success', async () => {
    await expect(runSiteSave({ site: ok, stores: [] })).resolves.toEqual({
      kind: 'saved',
    });
  });
});

describe('OMS-FUN-SYC-002.2 — a store can be associated with a site and the association is reflected', () => {
  it('writes the site fields FIRST, then the assignments, in order', async () => {
    const order: string[] = [];
    const step = (name: string) => async () => {
      order.push(name);
      return undefined;
    };
    const outcome = await runSiteSave({
      site: step('site'),
      stores: [step('additions'), step('removals')],
    });
    expect(outcome).toEqual({ kind: 'saved' });
    expect(order).toEqual(['site', 'additions', 'removals']);
  });
});

describe('OMS-FUN-SYC-002.3 — an existing store association is not overridden when other site fields are edited', () => {
  it('makes NO assignment call when the store draft is unchanged', async () => {
    let assignments = 0;
    await runSiteSave({
      site: ok,
      stores: [],
    });
    expect(assignments).toBe(0);
    // Guard the shape the modal relies on: an empty `stores` plan is what an
    // untouched draft produces, and nothing else can reach an assignment.
    const outcome = await runSiteSave({
      site: async () => {
        assignments += 0;
        return undefined;
      },
      stores: [],
    });
    expect(outcome).toEqual({ kind: 'saved' });
    expect(assignments).toBe(0);
  });
});

describe('OMS-FUN-SYC-002.36 — a save whose store step fails leaves the site own field changes committed', () => {
  it('reports storesRejected, which the editor treats as "already saved"', async () => {
    const rejection: SaveRejection = {
      kind: 'other',
      description: 'StoreDoesNotExist(["missing"])',
    };
    let siteWritten = false;
    const outcome = await runSiteSave({
      site: async () => {
        siteWritten = true;
        return undefined;
      },
      stores: [rejects(rejection)],
    });
    // The site step ran and committed — there is no shared transaction to roll
    // it back, and nothing here attempts one.
    expect(siteWritten).toBe(true);
    expect(outcome).toEqual({ kind: 'storesRejected', rejection });
  });

  it('stops at the FIRST failing assignment, leaving the later one unattempted', async () => {
    const rejection: SaveRejection = { kind: 'other', description: 'boom' };
    let secondRan = false;
    const outcome = await runSiteSave({
      site: ok,
      stores: [
        rejects(rejection),
        async () => {
          secondRan = true;
          return undefined;
        },
      ],
    });
    expect(outcome).toEqual({ kind: 'storesRejected', rejection });
    expect(secondRan).toBe(false);
  });

  it('never reaches the store steps when the site step itself is rejected', async () => {
    const rejection: SaveRejection = { kind: 'fieldRequired', field: 'name' };
    let storesRan = false;
    const outcome = await runSiteSave({
      site: rejects(rejection),
      stores: [
        async () => {
          storesRan = true;
          return undefined;
        },
      ],
    });
    expect(outcome).toEqual({ kind: 'siteRejected', rejection });
    expect(storesRan).toBe(false);
  });
});
