// The Item domain module: a reusable server-side-filtered, infinite-scroll item
// picker (ItemSearch) over the paginated `items` query, plus the paginated-
// search primitive it's built on (currently item-only; entity-agnostic, so
// liftable to a generic search once a second consumer appears).
export { ItemSearch, type ItemSearchProps } from './ItemSearch';
export { type ItemOption } from './itemResource';
export {
  createPaginatedSearch,
  type PaginatedSearch,
  type Page,
} from '../search/createPaginatedSearch';
