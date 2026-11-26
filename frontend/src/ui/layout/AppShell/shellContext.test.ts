import { createRoot } from 'solid-js';
import { describe, expect, it } from 'vitest';
import { createParentRegistry } from './shellContext';

// The breadcrumb → shell half of navigate-up (spec/keyboard KB-X5): the page's
// trail registers its parent crumb, Escape reads the newest.
describe('createParentRegistry', () => {
  it('reports nothing until a trail registers', () => {
    createRoot(dispose => {
      expect(createParentRegistry().current()).toBeUndefined();
      dispose();
    });
  });

  it('follows the registered parent as it changes', () => {
    createRoot(dispose => {
      const registry = createParentRegistry();
      let to = '/S/inventory/stocktakes';
      registry.register(() => to);
      expect(registry.current()).toBe('/S/inventory/stocktakes');
      to = '/S/inventory/locations';
      expect(registry.current()).toBe('/S/inventory/locations');
      dispose();
    });
  });

  it('keeps the incoming page’s parent when the outgoing trail withdraws after it mounts', () => {
    createRoot(dispose => {
      const registry = createParentRegistry();
      const withdrawOld = registry.register(() => '/S/old-list');
      registry.register(() => '/S/new-list');
      withdrawOld();
      expect(registry.current()).toBe('/S/new-list');
      dispose();
    });
  });

  it('reports no parent once the last trail withdraws', () => {
    createRoot(dispose => {
      const registry = createParentRegistry();
      registry.register(() => '/S/list')();
      expect(registry.current()).toBeUndefined();
      dispose();
    });
  });
});
