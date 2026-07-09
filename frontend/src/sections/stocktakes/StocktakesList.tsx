import { createMemo, createResource, createSignal, For, Show } from 'solid-js';
import type { Component } from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import { graphqlFetch } from '../../api/graphql';
import { localisedDate } from '../../intl';
import { Page } from '../../components/layout/Page/Page';
import { Header } from '../../components/layout/Header/Header';
import { Breadcrumb } from '../../components/layout/Header/Breadcrumb';
import { HeaderButtons } from '../../components/layout/Header/HeaderButtons';
import { Toolbar } from '../../components/layout/Header/Toolbar';
import { ContentFooter } from '../../components/layout/ContentFooter/ContentFooter';
import { ContentFooterActions } from '../../components/layout/ContentFooter/ContentFooterActions';
import { Button } from '../../components/ui/Button';
import { Table, SortHeader } from '../../components/ui/Table';
import { EmptyState } from '../../components/ui/EmptyState';
import { FilterBar, type FilterValues } from '../../components/ui/FilterBar';
import { Pagination } from '../../components/ui/Pagination/Pagination';
import { PlusCircleIcon, TrashIcon } from '../../components/icons';
import { useUrlQueryState } from '../../list/urlQueryState';
import { Stocktakes } from './stocktakes.generated';
import type { StocktakesVariables, StocktakesResult } from './stocktakes.generated';
import {
  FILTER_FIELDS,
  toStocktakeFilter,
  toFilterValues,
  type StocktakeFilter,
} from './listFilters';

// The stocktakes list view — the reference list screen. Data + URL-backed
// filter/sort/pagination state come from the vertical (kept from the reference
// implementation); the UI is composed entirely from library components (Page /
// Header / FilterBar / Table / Pagination / ContentFooter), so the page owns no
// CSS. Spec: spec/stocktakes (S1) + spec/ui-standards/list-views.

const DEFAULT_PAGE_SIZE = 20;

type StocktakeRow = StocktakesResult['stocktakes']['nodes'][number];

// Sortable columns are typed to the generated sort-field union, so a column can
// only ever name a real sort key (kdd/type-safety).
type SortKey = NonNullable<StocktakesVariables['sort']>[number]['key'];

// URL-backed state. Filter and sort are exactly the generated GraphQL shapes (no
// remapping); pagination is offset + first, carried in the URL.
type StocktakesListState = {
  filter: StocktakeFilter;
  sort?: StocktakesVariables['sort'];
  offset: number;
  first: number;
};

const DEFAULT_STATE: StocktakesListState = { filter: {}, offset: 0, first: DEFAULT_PAGE_SIZE };

const statusLabel = (status: StocktakeRow['status']) =>
  status === 'FINALISED' ? 'Finalised' : 'New';

const StocktakesList: Component = () => {
  // storeId is guaranteed present: this section renders only inside
  // StoreGuardLayout, which requires a resolved store before routing.
  const params = useParams<{ storeId: string }>();
  const navigate = useNavigate();
  const { state, setState } = useUrlQueryState<StocktakesListState>(DEFAULT_STATE);
  const [picked, setPicked] = createSignal<Set<string>>(new Set());

  // GraphQL variables, derived straight from URL state + the store in the path.
  const variables = createMemo<StocktakesVariables>(() => ({
    storeId: params.storeId,
    filter: state().filter,
    sort: state().sort,
    page: { first: state().first, offset: state().offset },
  }));

  // Global resource-style fetch (kdd/state-management): the fetcher passes codegen
  // output through the single never-throwing query method. Failures are handled
  // globally inside graphqlFetch (unexpected-error modal); here we keep the
  // previous data / loading state.
  const [data] = createResource(variables, async (vars) => {
    const result = await graphqlFetch(Stocktakes, vars);
    if (result.kind !== 'success') return undefined;
    return result.data.stocktakes;
  });

  const rows = () => data()?.nodes ?? [];
  const totalCount = () => data()?.totalCount ?? 0;

  const activeSort = () => state().sort?.[0];
  const directionFor = (key: SortKey): 'asc' | 'desc' | false => {
    const sort = activeSort();
    if (sort?.key !== key) return false;
    return sort.desc ? 'desc' : 'asc';
  };
  const ariaSortFor = (key: SortKey): 'ascending' | 'descending' | 'none' => {
    const dir = directionFor(key);
    return dir === 'asc' ? 'ascending' : dir === 'desc' ? 'descending' : 'none';
  };

  // Clicking a sortable header: sort ascending, or flip direction if it is
  // already the key. Resets to the first page. Written as the GraphQL array shape.
  const onSort = (key: SortKey) => {
    const sort = activeSort();
    const desc = sort?.key === key ? !sort.desc : false;
    setState({ ...state(), sort: [{ key, desc }], offset: 0 });
  };

  const onFilterChange = (values: FilterValues) => {
    setState({ ...state(), filter: toStocktakeFilter(values), offset: 0 });
    setPicked(new Set<string>());
  };

  const onOffsetChange = (offset: number) => setState({ ...state(), offset });

  const toggle = (id: string) => {
    const next = new Set(picked());
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setPicked(next);
  };

  const openRow = (id: string) =>
    navigate(`/${params.storeId}/inventory/stocktakes/${id}`);

  const crumbs = [{ label: 'Inventory' }, { label: 'Stocktakes' }];

  return (
    <Page
      header={
        <Header>
          <Breadcrumb crumbs={crumbs} />
          <HeaderButtons>
            {/* Create flow (modal) is deferred with the detail work — needs the
                ⛔ Modal dialog. The button anchors the recipe shape for now. */}
            <Button icon={<PlusCircleIcon />} disabled title="Coming soon">
              New stocktake
            </Button>
          </HeaderButtons>
          <Toolbar>
            <FilterBar
              fields={FILTER_FIELDS}
              values={toFilterValues(state().filter)}
              onChange={onFilterChange}
            />
          </Toolbar>
        </Header>
      }
      contentFooter={
        <Show when={picked().size > 0}>
          <ContentFooter>
            <strong>{picked().size} selected</strong>
            <ContentFooterActions>
              <Button variant="secondary" onClick={() => setPicked(new Set<string>())}>
                Clear
              </Button>
              {/* Batch delete is deferred (mutation + confirmation dialog). */}
              <Button variant="secondary" icon={<TrashIcon />} disabled title="Coming soon">
                Delete
              </Button>
            </ContentFooterActions>
          </ContentFooter>
        </Show>
      }
    >
      <Show
        when={rows().length > 0}
        fallback={<EmptyState message="No stocktakes match these filters." />}
      >
        <Table label="Stocktakes">
          <thead>
            <tr>
              <th data-check aria-label="Select" />
              <th data-numeric aria-sort={ariaSortFor('stocktakeNumber')}>
                <SortHeader
                  label="Number"
                  direction={directionFor('stocktakeNumber')}
                  onSort={() => onSort('stocktakeNumber')}
                />
              </th>
              <th aria-sort={ariaSortFor('status')}>
                <SortHeader label="Status" direction={directionFor('status')} onSort={() => onSort('status')} />
              </th>
              <th aria-sort={ariaSortFor('description')}>
                <SortHeader label="Description" direction={directionFor('description')} onSort={() => onSort('description')} />
              </th>
              <th aria-sort={ariaSortFor('comment')}>
                <SortHeader label="Comment" direction={directionFor('comment')} onSort={() => onSort('comment')} />
              </th>
              <th aria-sort={ariaSortFor('stocktakeDate')}>
                <SortHeader label="Stocktake date" direction={directionFor('stocktakeDate')} onSort={() => onSort('stocktakeDate')} />
              </th>
              <th aria-sort={ariaSortFor('createdDatetime')}>
                <SortHeader label="Created" direction={directionFor('createdDatetime')} onSort={() => onSort('createdDatetime')} />
              </th>
              <th>Locked</th>
            </tr>
          </thead>
          <tbody>
            <For each={rows()}>
              {(row) => (
                <tr data-selected={picked().has(row.id) ? '' : undefined}>
                  <td data-check>
                    <input
                      type="checkbox"
                      checked={picked().has(row.id)}
                      onChange={() => toggle(row.id)}
                      aria-label={`Select stocktake ${row.stocktakeNumber}`}
                    />
                  </td>
                  <td data-numeric>
                    <button type="button" data-row-link onClick={() => openRow(row.id)}>
                      {row.stocktakeNumber}
                    </button>
                  </td>
                  <td>{statusLabel(row.status)}</td>
                  <td data-muted>{row.description ?? '—'}</td>
                  <td data-muted>{row.comment ?? '—'}</td>
                  <td data-muted>{row.stocktakeDate ? localisedDate(row.stocktakeDate) : '—'}</td>
                  <td data-muted>{localisedDate(row.createdDatetime)}</td>
                  <td>{row.isLocked ? 'Yes' : 'No'}</td>
                </tr>
              )}
            </For>
          </tbody>
        </Table>
        <Pagination
          offset={state().offset}
          pageSize={state().first}
          total={totalCount()}
          onOffsetChange={onOffsetChange}
        />
      </Show>
    </Page>
  );
};

export default StocktakesList;
