// The Name domain module (kdd/domain-modules): a reusable server-side-filtered,
// infinite-scroll name picker (NameSearch) over the paginated `names` query,
// narrowable by role (supplier / customer / donor / manufacturer). Built on
// the shared createPaginatedSearch primitive (ui/utils, via AsyncCombobox).
export { NameSearch, type NameSearchProps } from './NameSearch';
export {
  namePageFetcher,
  toNameOption,
  type NameOption,
  type NameRole,
  type PartyKind,
} from './nameResource';
