import { describe, expect, it } from 'vitest';
import { navConfig, navDestinations, navSections } from './navConfig';

// spec/navigation § sections are headings (OMS-REG-NAV-01.27): the router
// generates one route per destination, so a section among the destinations is
// what rendered "Coming soon" at `/{store}/inventory` (issue #288).
describe('the registry separates sections from destinations', () => {
  it('gives no section a destination entry', () => {
    const destinationPaths = new Set(navDestinations.map(dest => dest.path));
    for (const section of navSections) {
      expect(destinationPaths.has(section.path)).toBe(false);
    }
  });

  it('lists every section child and every top-level destination', () => {
    const expected = navConfig.flatMap(item => item.children ?? [item]);
    expect(navDestinations).toEqual(expected);
  });

  it('names exactly the entries that have children as sections', () => {
    expect(navSections.map(section => section.path)).toEqual(
      navConfig.filter(item => item.children).map(item => item.path)
    );
    expect(navSections.map(section => section.path)).toContain('inventory');
  });
});
