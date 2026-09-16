// The Item domain module: a reusable server-side-filtered, infinite-scroll item
// picker (ItemSearch) over the paginated `items` query. The paginated-search
// primitive it's built on now lives in the shared UI layer
// (src/ui/utils/createPaginatedSearch) alongside AsyncCombobox, its general
// home.
export { ItemSearch, type ItemSearchProps } from './ItemSearch';
export { type ItemOption, fetchItemById, itemPageFetcher } from './itemResource';
