import { describe, expect, it } from 'vitest';
import { pluginTableId } from './tableState';

/*
 * The stored identity of a plugin table's column layout.
 *
 * Pinned because the value is a STORAGE KEY, not an implementation detail: it
 * is written into a user's app data and into the store-wide global-config
 * blob, and outlives the code that wrote it. Changing the join orphans every
 * saved layout silently — nothing errors, widths simply revert.
 */
describe('pluginTableId', () => {
  it('namespaces a table under its plugin, as a contributed column id is', () => {
    // sdk-contract § contributed columns: `${pluginCode}.${id}` is the
    // published identity two plugins can never collide on.
    expect(pluginTableId('cook_islands_plugins', 'count-log')).toBe(
      'cook_islands_plugins.count-log'
    );
  });

  it('keeps two plugins that name a table the same thing apart', () => {
    expect(pluginTableId('civ_plugins', 'log')).not.toBe(
      pluginTableId('cook_islands_plugins', 'log')
    );
  });

  it('can never collide with a HOST table, whose ids are bare', () => {
    // The host's own tables store under 'stocktakes', 'names', … — no dot, no
    // prefix. A plugin cannot reach one, and cannot be reached BY one.
    expect(pluginTableId('cook_islands_plugins', 'stocktakes')).not.toBe(
      'stocktakes'
    );
  });
});
