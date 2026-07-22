// The Name domain module (kdd/domain-modules): a reusable server-side-filtered,
// infinite-scroll name picker (NameSearch) over the paginated `names` query,
// narrowable by role (supplier / donor / manufacturer). Built on the item
// module's createPaginatedSearch primitive.
export { NameSearch, type NameSearchProps } from './NameSearch';
export {
  namePageFetcher,
  type NameOption,
  type NameRole,
} from './nameResource';
