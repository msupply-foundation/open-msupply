import { useSearchParams } from '@solidjs/router';

// A screen's open tab, kept in the address as `?tab=` so a link opens it and
// Back steps between tabs (kdd/url-structure). The first tab is the default
// and adds nothing, keeping the base URL clean; an unknown value reads as it.

export function useUrlTab<T extends string>(tabs: readonly [T, ...T[]]) {
  const [searchParams, setSearchParams] = useSearchParams<{ tab?: string }>();
  const [first] = tabs;
  return {
    tab: (): T => tabs.find(tab => tab === searchParams.tab) ?? first,
    setTab: (value: string) =>
      setSearchParams({ tab: value === first ? undefined : value }),
  };
}
