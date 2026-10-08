import { createMemo, createResource, createSignal, Show } from 'solid-js';
import type { Component } from 'solid-js';
import { useParams } from '@solidjs/router';
import { graphqlFetch } from '@/api/graphql';
import { t, tPlural } from '@/intl';
import { Page } from '@/ui/layout/Page/Page';
import { Header } from '@/ui/layout/Header/Header';
import { Breadcrumb } from '@/ui/layout/Header/Breadcrumb';
import { HeaderButtons } from '@/ui/layout/Header/HeaderButtons';
import { Toolbar } from '@/ui/layout/Header/Toolbar';
import { Button } from '@/ui/elements/buttons/Button';
import { Alert } from '@/ui/elements/feedback/Alert';
import { ImportIcon } from '@/ui/icons';
import {
  DataTable,
  type Column,
  type SortState,
} from '@/ui/elements/table/DataTable';
import { getCellDefinition } from '@/ui/elements/table/tableHelpers';
import { getBooleanCell } from '@/ui/elements/table/BooleanCell';
import { remToPx } from '@/ui/utils/rem';
import { FilterBar } from '@/ui/elements/selectors/FilterBar';
import { createTableConfig } from '@/api/createTableConfig';
import { useUrlQueryState } from '@/list/urlQueryState';
import { NameProperties } from '../names.generated';
import { Facilities } from './facilityRegister.generated';
import type { FacilitiesVariables } from './facilityRegister.generated';
import {
  DEFAULT_STATE,
  PAGE_SIZE_OPTIONS,
  buildRegisterVariables,
  facilityStoreId,
  nextFacility,
  type FacilitiesFilter,
  type FacilityRegisterState,
  type FacilityRow,
  type FacilitySortKey,
} from './facilityRegisterLogic';
import { registerFilters } from './registerFilters';

/*
 * The store editor is the SETTINGS vertical's screen (spec/names § the facility
 * editor: "specified once, in settings/; this vertical does not restate it").
 * The register supplies only the subject and the save-and-move-on affordance.
 *
 * Both modals are imported STATICALLY, deliberately. A `lazy()` component
 * mounted on an interaction suspends the route's Suspense boundary while its
 * chunk loads — which tears down this whole page and, with it, any open
 * <dialog> (kdd/solid-reactivity-pitfalls § no remounts on interaction: the
 * boundary is the same one the resource rules are about). The register route is
 * itself a lazy chunk, so the cost is paid on entering the screen, not at app
 * start.
 */
import { StoreEditorModal } from '@/sections/settings/store-editor/StoreEditorModal';
import { ImportPropertiesModal } from './ImportPropertiesModal';

/*
 * S5 — the FACILITY REGISTER (Manage › Stores), the central server's list of
 * every facility on the server (spec/names slice 3). The standard list screen,
 * with three deviations that are the whole of what makes it the third list
 * rather than a third role on the first two:
 *
 *  - NOT store-scoped. `isStore: true` is evaluated against the name's own
 *    store row, so the row set is identical for every store on the server,
 *    including the signed-in store's own name (`.20`).
 *  - Supplier / Customer / Donor flag columns replace the store indicator and
 *    the custom-field columns; none of the three is sortable (`.23`–`.25`).
 *  - It is the vertical's only WRITING surface: a row opens the store editor on
 *    that facility, and the one page action is the bulk property import.
 *
 * The central-server gate lives on the MENU entry (`manage/stores`, gate
 * `central` in the navigation registry), not on this route or on the read —
 * the register's data carries no requirement past store access, so the screen
 * renders wherever it is reached from (rules § access; contract wire trap).
 *
 * Reactivity: the list resource is read through `.latest` and the property
 * definitions through the `.state` gate — the definitions first fetch while
 * this screen is already open and their pending read must never suspend the
 * boundary the table and any open <dialog> live in (kdd/solid-reactivity-
 * pitfalls § no remounts on interaction).
 */
const FacilityRegister: Component = () => {
  // storeId is guaranteed present: the section renders only inside
  // StoreGuardLayout, which requires a resolved, authorised store before
  // routing. It travels as the resolver's authorisation subject and decides
  // what isCustomer/isSupplier report per row — never which rows come back.
  const params = useParams<{ storeId: string }>();
  const { query, setQuery } =
    useUrlQueryState<FacilityRegisterState>(DEFAULT_STATE);

  // The facility whose editor is open — undefined = closed.
  const [editingId, setEditingId] = createSignal<string>();
  const [importOpen, setImportOpen] = createSignal(false);
  /*
   * The import's in-place feedback on the list (controls § action feedback,
   * never a toast): either the "nothing configured to import" refusal that
   * stands in for opening an empty modal (`.33`), or the count a completed run
   * wrote, which the modal cannot state because a successful run closes it
   * (`.43`).
   */
  const [importNotice, setImportNotice] = createSignal<
    { kind: 'none-configured' } | { kind: 'written'; count: number }
  >();

  const tableConfig = createTableConfig({ tableId: 'facility-register' });

  const variables = createMemo<FacilitiesVariables>(() =>
    buildRegisterVariables({ storeId: params.storeId, state: query() })
  );

  const [data] = createResource(
    () => JSON.stringify(variables()),
    async serialised => {
      const result = await graphqlFetch(
        Facilities,
        JSON.parse(serialised) as FacilitiesVariables
      );
      if (result.kind !== 'success') return undefined;
      return result.data.names;
    }
  );

  // `.latest` never suspends: the table mounts immediately and shows its own
  // loading treatment instead of blanking the section.
  const rows = () => data.latest?.nodes ?? [];
  const totalCount = () => data.latest?.totalCount ?? 0;

  /*
   * The name-property DEFINITIONS. Their EMPTINESS is the gate on the whole
   * import feature (contract § importing facility properties), so the register
   * reads them up front — the action is unavailable while the read is in
   * flight, and refuses in place once it lands empty.
   */
  const [definitionsData] = createResource(async () => {
    const result = await graphqlFetch(NameProperties, {}, { background: true });
    return result.kind === 'success' ? result.data.nameProperties.nodes : [];
  });
  const definitions = () =>
    definitionsData.state === 'ready' || definitionsData.state === 'refreshing'
      ? (definitionsData.latest ?? [])
      : [];

  const onImport = () => {
    setImportNotice(undefined);
    if (definitions().length === 0)
      return setImportNotice({ kind: 'none-configured' });
    setImportOpen(true);
  };

  const currentSort = (): SortState<FacilitySortKey> | undefined => {
    const s = query().sort?.[0];
    return s ? { key: s.key, desc: s.desc ?? false } : undefined;
  };

  const onSort = (key: FacilitySortKey, desc: boolean) =>
    setQuery({ ...query(), sort: [{ key, desc }], offset: 0 });

  const onFilterChange = (filter: FacilitiesFilter) =>
    setQuery({ ...query(), filter, offset: 0 });

  // The edited row's own store id, resolved from the page already loaded —
  // the store editor's Preferences tab writes against it, not against the
  // signed-in store (spec/names § the facility editor).
  const editingStoreId = () => facilityStoreId(rows(), editingId());

  // Save-and-move-on walks the page of rows AS IT CURRENTLY STANDS — same
  // search, same sort, same page (`.31`). Undefined on the last row of the
  // loaded page, which is what disables the action there (`.32`).
  const next = () => nextFacility(rows(), editingId());

  // Columns are an accessor: headers come from t(), which must be read in a
  // reactive scope to re-translate on a language switch.
  const columns = (): Column<FacilityRow, FacilitySortKey>[] => [
    {
      c: { key: 'code' },
      sortKey: 'code',
      header: () => t('label.code'),
      // Plain text — NO store indicator: every row here is a store, so the
      // marker would carry no information (`.23`).
      ...getCellDefinition('code', { headerPosition: 'primary' }),
    },
    {
      c: { key: 'name' },
      sortKey: 'name',
      header: () => t('label.name'),
      ...getCellDefinition('name', { wrapLines: 2 }),
    },
    // The three flag columns (`.24`): the library's boolean cell in its `dot`
    // display — a marker when the flag is set, a genuinely blank cell when it
    // is not, the marker carrying the set state's accessible name (D8). None
    // carries a sortKey: NameSortFieldInput has no member for them (`.25`).
    {
      c: { key: 'isSupplier' },
      header: () => t('label.supplier'),
      ...getBooleanCell({ display: 'dot', label: t('label.supplier') }),
      size: remToPx(6),
    },
    {
      c: { key: 'isCustomer' },
      header: () => t('label.customer'),
      ...getBooleanCell({ display: 'dot', label: t('label.customer') }),
      size: remToPx(6),
    },
    {
      c: { key: 'isDonor' },
      header: () => t('label.donor'),
      ...getBooleanCell({ display: 'dot', label: t('label.donor') }),
      size: remToPx(6),
    },
  ];

  return (
    <>
      <Page
        fillBody
        header={
          <Header>
            <Breadcrumb crumbs={[{ label: t('stores') }]} />
            <HeaderButtons>
              {/* The register's ONE page action — no New, no Export, no bulk
                  anything (`.28`). Unavailable while the definitions read is
                  in flight; with none configured it refuses in place rather
                  than opening an empty modal (`.33`). */}
              <Button
                icon={<ImportIcon />}
                data-testid="import-properties-button"
                disabled={definitionsData.loading}
                onClick={onImport}
              >
                {t('button.import-properties')}
              </Button>
            </HeaderButtons>
            <Show when={importNotice()}>
              {notice => (
                <Toolbar>
                  <Show
                    when={
                      notice().kind === 'written'
                        ? (notice() as { count: number })
                        : undefined
                    }
                    fallback={
                      <Alert severity="info" testId="no-properties-to-import">
                        {t('error.no-properties-to-import')}
                      </Alert>
                    }
                  >
                    {written => (
                      <Alert severity="success" testId="import-properties-done">
                        {tPlural(
                          'messages.import-facilities-updated',
                          written().count
                        )}
                      </Alert>
                    )}
                  </Show>
                </Toolbar>
              )}
            </Show>
          </Header>
        }
      >
        <DataTable
          columns={columns()}
          rows={rows()}
          rowKey={row => row.id}
          // Filters live in the table's own toolbar, never the page header
          // (ui-standards § tables → filtering, binding; D81). One filter: the
          // name/code search (`.27`).
          filters={
            <FilterBar
              filters={registerFilters()}
              filter={query().filter}
              onChange={onFilterChange}
            />
          }
          loading={data.loading}
          sort={currentSort()}
          onSort={onSort}
          onRowClick={row => setEditingId(row.id)}
          // The empty state offers NO create action — a facility cannot be
          // created here (`.29`; rules § read-only).
          emptyMessage={t('error.no-stores')}
          config={tableConfig.config()}
          setConfig={tableConfig.setConfig}
          configIsDefault={tableConfig.isConfigDefault()}
          onSaveGlobalDefault={
            tableConfig.canSaveGlobalDefault()
              ? tableConfig.saveGlobalTableConfig
              : undefined
          }
          // Server-side pagination; the total reflects the full filtered set
          // (`.17`–`.19`). No selection column and no bulk-action footer.
          pagination={{
            offset: query().offset,
            pageSize: query().first,
            total: totalCount(),
            pageSizes: [...PAGE_SIZE_OPTIONS],
            onOffsetChange: offset => setQuery({ ...query(), offset }),
            onPageSizeChange: first =>
              setQuery({ ...query(), first, offset: 0 }),
          }}
        />
      </Page>

      {/* Settings' store editor, on the CHOSEN row rather than the signed-in
          store (`.30`), carrying the register-only save-and-move-on (`.31`). */}
      <Show when={editingId()}>
        {id => (
          <StoreEditorModal
            open
            storeId={params.storeId}
            nameId={id()}
            // The chosen row's OWN store — the Preferences tab's subject. The
            // signed-in store above is only the request's authorisation
            // subject; passing it here would edit the wrong store's
            // preferences behind this facility's name.
            facilityStoreId={editingStoreId() ?? ''}
            onClose={() => setEditingId(undefined)}
            hasNext={next() !== undefined}
            onSaveAndNext={() => setEditingId(next()?.id)}
          />
        )}
      </Show>

      <Show when={importOpen()}>
        <ImportPropertiesModal
          storeId={params.storeId}
          definitions={definitions()}
          onClose={() => setImportOpen(false)}
          onSucceeded={written => {
            setImportOpen(false);
            setImportNotice({ kind: 'written', count: written });
          }}
        />
      </Show>
    </>
  );
};

export default FacilityRegister;
