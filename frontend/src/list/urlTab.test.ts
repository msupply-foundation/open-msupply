import { describe, expect, it, vi } from 'vitest';

// The address's search params, as the router's hook hands them out.
const searchParams: { tab?: string } = {};
vi.mock('@solidjs/router', () => ({
  useSearchParams: () => [
    searchParams,
    (next: { tab?: string }) => Object.assign(searchParams, next),
  ],
}));

import { useUrlTab } from './urlTab';

describe('useUrlTab', () => {
  it('reads the first tab from a bare address, and an unknown value as it', () => {
    const { tab } = useUrlTab(['import', 'export']);
    delete searchParams.tab;
    expect(tab()).toBe('import');
    searchParams.tab = 'nonsense';
    expect(tab()).toBe('import');
    searchParams.tab = 'export';
    expect(tab()).toBe('export');
  });

  it('keeps the first tab out of the address', () => {
    const { tab, setTab } = useUrlTab(['import', 'export']);
    setTab('export');
    expect(searchParams.tab).toBe('export');
    setTab('import');
    expect(searchParams.tab).toBeUndefined();
    expect(tab()).toBe('import');
  });
});
