/*
 * A plugin page's own query string (sdk-contract § the page contribution).
 *
 * A page that takes instructions in its URL — the Cook Islands Count screen's
 * `?order=` scope — reads them here rather than from `window.location`, which
 * no client-side navigation re-renders for. The query VOCABULARY is the
 * page's own: the host routes on the path and hands the whole query over,
 * interpreting none of it.
 *
 * Router-free, through the same one-writer binding as `navigateTo`
 * (src/nav/hostSearch.ts): the router stays internal and swappable, and the
 * SDK entry stays free of its module-scope side effects.
 */
import { hostSearch } from '../nav/hostSearch';

/**
 * The current query, reactive: reading the returned accessor inside a
 * component tracks navigation, so a page updates in place when only its
 * query changes. Called from a component body like every `use*` here.
 */
export const usePageSearch = (): (() => URLSearchParams) => {
  return () => new URLSearchParams(hostSearch());
};
