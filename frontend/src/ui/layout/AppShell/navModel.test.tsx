import { describe, expect, it } from 'vitest';
import {
  CatalogueIcon,
  HomeIcon,
  ReplenishmentIcon,
  SettingsIcon,
  StockIcon,
  TruckIcon,
} from '../../icons';
import { sectionIconForPath } from './navModel';

/*
 * The route → section-glyph lookup behind every page's breadcrumb icon
 * (spec/ui-standards › layout, page regions: the nav group is never a crumb,
 * its glyph takes the trail's leading-icon slot on every screen in the group).
 *
 * A .tsx suite because navModel pulls in the icon components, which need the
 * Solid JSX transform — the `solid` vitest project (vitest.workspace.ts). No
 * icon is CALLED here, so no DOM is needed.
 */
describe('sectionIconForPath', () => {
  it('gives a section landing screen its own glyph', () => {
    // Home keeps the route `dashboard`; the glyph is the house (CK-1.7).
    expect(sectionIconForPath('dashboard')).toBe(HomeIcon);
    expect(sectionIconForPath('settings')).toBe(SettingsIcon);
  });

  it("gives a child destination its GROUP's glyph, not its own", () => {
    expect(sectionIconForPath('inventory/stocktakes')).toBe(StockIcon);
    expect(sectionIconForPath('distribution/customer-requisition')).toBe(
      TruckIcon
    );
    expect(sectionIconForPath('replenishment/inbound-shipment')).toBe(
      ReplenishmentIcon
    );
  });

  it('carries the group down to a record screen, however deep', () => {
    // Detail routes are the whole point: a record screen sits under no nav
    // entry of its own, so only the first segment can place it.
    expect(
      sectionIconForPath('distribution/customer-requisition/abc-123')
    ).toBe(TruckIcon);
    expect(sectionIconForPath('catalogue/items/abc-123')).toBe(CatalogueIcon);
  });

  it('has none for a path outside the nav tree', () => {
    // The router's catch-all (not-found) shows no glyph rather than a wrong
    // one. The store root never reaches here — the shell reads it as
    // 'dashboard'.
    expect(sectionIconForPath('nowhere/at/all')).toBeUndefined();
    expect(sectionIconForPath('')).toBeUndefined();
  });
});
