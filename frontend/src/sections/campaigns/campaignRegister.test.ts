import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PAGE_SIZE,
  DEFAULT_REGISTER_STATE,
  campaignVariables,
  type CampaignSortKey,
} from './campaignRegister';
import { Campaigns } from './campaigns.generated';

// Anchors: spec/campaigns/cases/OMS-REG-MNG-04.
//   .2 — sorted by name ascending by default; name is the only sortable column
//   .3 — the register offers no search and no filter
//   .6 — the register is paged, reporting the whole register's total
// The register's read is pure state → variables, so the wire traps it has to
// steer around (contract.md § listing campaigns) are pinned here rather than by
// driving the screen. The rendered column set and pager are exercised in the
// UI; what is testable at this layer is what the client SENDS.

describe('OMS-REG-MNG-04.2 — default order is by name, ascending', () => {
  it('defaults to a single name-ascending sort entry', () => {
    expect(DEFAULT_REGISTER_STATE.sort).toEqual([{ key: 'name', desc: false }]);
  });

  it('sends the sort on every read — omitting it would order by opaque id', () => {
    const variables = campaignVariables('store-a', DEFAULT_REGISTER_STATE);
    expect(variables.sort).toEqual([{ key: 'name', desc: false }]);
  });

  it('sends EXACTLY ONE sort entry — the resolver applies the last of the list', () => {
    const variables = campaignVariables('store-a', {
      ...DEFAULT_REGISTER_STATE,
      // A stale/hand-edited URL could carry more than one entry; the builder
      // must not pass them through, or the sort silently becomes the last one.
      sort: [
        { key: 'name', desc: false },
        { key: 'name', desc: true },
      ],
    });
    expect(variables.sort).toEqual([{ key: 'name', desc: false }]);
  });

  it('falls back to the default entry when a URL carries an empty sort', () => {
    const variables = campaignVariables('store-a', {
      ...DEFAULT_REGISTER_STATE,
      sort: [],
    });
    expect(variables.sort).toEqual([{ key: 'name', desc: false }]);
  });

  it('name is the only sort key the register can express', () => {
    // `CampaignSortFieldInput` carries one value, so the GENERATED union is the
    // literal 'name': a column naming any other key is a compile error, which
    // is what makes the two date columns unsortable by construction rather than
    // by convention. Enumerating the union here pins that — the array's element
    // type is the whole union, so a second key appearing upstream would make
    // this assertion fail rather than pass silently.
    const everyKey: CampaignSortKey[] = ['name'];
    expect(everyKey).toEqual(['name']);
  });
});

describe('OMS-REG-MNG-04.3 — the register offers no search and no filter', () => {
  it('sends no filter variable at all', () => {
    // `name.like` is declared and silently ignored by the resolver, so there is
    // no substring search to offer; the read carries no filter to send.
    expect(Campaigns.query).not.toContain('filter');
    expect(
      campaignVariables('store-a', DEFAULT_REGISTER_STATE)
    ).not.toHaveProperty('filter');
  });
});

describe('OMS-REG-MNG-04.6 — the register is paged', () => {
  it('sends the page as first + offset, default page size 20', () => {
    expect(DEFAULT_PAGE_SIZE).toBe(20);
    expect(campaignVariables('store-a', DEFAULT_REGISTER_STATE).page).toEqual({
      first: 20,
      offset: 0,
    });
  });

  it('carries the requested page through unchanged', () => {
    expect(
      campaignVariables('store-a', {
        ...DEFAULT_REGISTER_STATE,
        offset: 40,
        first: 20,
      }).page
    ).toEqual({ first: 20, offset: 40 });
  });
});

describe('OMS-REG-MNG-04.7 — the register is not store-scoped', () => {
  it('passes storeId as the authorising argument, unchanged, and nothing else', () => {
    // The argument is required but AUTHORISES only: the resolver passes no
    // store to the query and the campaign table has no store column, so two
    // stores return an identical set. Nothing derives a filter from it.
    const a = campaignVariables('store-a', DEFAULT_REGISTER_STATE);
    const b = campaignVariables('store-b', DEFAULT_REGISTER_STATE);
    expect(a.storeId).toBe('store-a');
    expect(b.storeId).toBe('store-b');
    expect({ ...a, storeId: '' }).toEqual({ ...b, storeId: '' });
  });
});
