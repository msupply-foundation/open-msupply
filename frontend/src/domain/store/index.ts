// The Store domain module (kdd/domain-modules): the shared "Store lookup"
// registry role — a server-side-filtered, infinite-scroll picker over EVERY
// store the server holds, optionally withholding ids the caller names. Built
// on the shared createPaginatedSearch primitive (ui/utils, via AsyncCombobox).
export { StoreSearch, type StoreSearchProps } from './StoreSearch';
export {
  storePageFetcher,
  storeSearchFilter,
  type StoreOption,
} from './storeResource';
