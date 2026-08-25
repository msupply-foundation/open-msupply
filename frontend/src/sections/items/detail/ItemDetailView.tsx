import {
  createMemo,
  createResource,
  createSignal,
  Show,
  Suspense,
  type Component,
} from 'solid-js';
import { useNavigate, useParams, useSearchParams } from '@solidjs/router';
import { graphqlFetch } from '../../../api/graphql';
import { gated } from '../../../api/gated';
import { createTableConfig } from '../../../api/createTableConfig';
import { isCentralServer } from '../../../api/serverInfo';
import { t } from '../../../intl';
import { Page } from '../../../ui/layout/Page/Page';
import { Header } from '../../../ui/layout/Header/Header';
import { Breadcrumb } from '../../../ui/layout/Header/Breadcrumb';
import { HeaderButtons } from '../../../ui/layout/Header/HeaderButtons';
import { Toolbar } from '../../../ui/layout/Header/Toolbar';
import { Button } from '../../../ui/elements/buttons/Button';
import { PlusCircleIcon } from '../../../ui/icons';
import {
  Tabs,
  TabList,
  TabPanel,
  type TabDef,
} from '../../../ui/elements/tabs/Tabs';
import { StatsPanel } from '../../../ui/elements/dashboard/StatsPanel';
import { Statistic } from '../../../ui/elements/dashboard/Statistic';
import { ContentContainer } from '../../../ui/layout/ContentContainer/ContentContainer';
import { FormColumns } from '../../../ui/layout/Form/FormColumns';
import { FormColumn } from '../../../ui/layout/Form/FormColumn';
import { FormSection } from '../../../ui/layout/Form/FormSection';
import { FormRow } from '../../../ui/layout/Form/FormRow';
import { LabelledValue } from '../../../ui/elements/typography/LabelledValue';
import { Spinner } from '../../../ui/elements/feedback/Spinner';
import { ConfirmDialog } from '../../../ui/elements/feedback/ConfirmDialog';
import { DataTable, type Column } from '../../../ui/elements/table/DataTable';
import { getCellDefinition } from '../../../ui/elements/table/tableHelpers';
import { ActivityLogPanel } from '../../../domain/activityLog';
import { CustomFieldsView } from '../../../domain/customFields';
import { ItemDetail, type ItemDetailResult } from './itemDetail.generated';
import { ItemLedgerPanel } from './ItemLedgerPanel';
import { ItemAncillaryPanel } from './ItemAncillaryPanel';
import type { AncillaryEditorState } from './AncillaryItemEditModal';
import { ItemVariantsPanel } from './ItemVariantsPanel';
import type { ItemVariantEditorState } from './ItemVariantEditModal';
import { visibleTabs } from './itemDetailTabs';
import {
  formatMonthsOfStock,
  formatUnits,
  dosesEquivalent,
} from '../list/itemStats';

// The item detail screen (spec/items S2). Read-only: the General and Store tabs
// render each field as a read-only labelled value (label above value, no input
// chrome — spec D67), grouped in a sectioned form (ui-standards detail-views:
// the sectioned form of read-only labelled values —
// ContentContainer/FormColumns/FormColumn/FormSection/FormRow/LabelledValue,
// the stock detail is the live reference). The Custom fields tab keeps the
// shared custom-fields disabled controls. The only writes are the central-only
// management flows (S3–S5), which are NOT built in this pass (flagged in
// BUILD_REPORT). Statistics band + URL-driven tabs (a tab is deep-linkable via
// ?tab=). The two-column section pairing (spec: "two-column, groups in order")
// reuses the pure-layout FormColumns/FormColumn row — column 1 then column 2
// preserves the spec's group order when the columns wrap to one.
//
// Built tabs: General, Store, Master lists, Ledger (ItemLedgerPanel — its own
// query/filters/pagination, kdd/state-management), Ancillary items
// (ItemAncillaryPanel — read-only everywhere, central-only add/edit/delete
// via AncillaryItemEditModal, OMS-REG-CAT-08), Custom fields, Log. Flagged:
// Variants (needs the variant card + editable packaging grid).
// Variants' tab PRESENCE is wired (OMS-REG-CAT-05.1/.2, itemDetailTabs.ts) —
// central-server-only, ahead of its content.

type ItemDetailRow = NonNullable<ItemDetailResult['items']['nodes'][number]>;
type MasterListRow = NonNullable<ItemDetailRow['masterLists']>[number];

const ItemDetailView: Component = () => {
  const params = useParams<{ storeId: string; itemId: string }>();
  const navigate = useNavigate();
  const [search, setSearch] = useSearchParams<{ tab?: string }>();
  const activeTab = () => search.tab ?? 'general';
  // The Ancillary items tab's add/edit modal — its trigger lives in the page
  // header (a page action, ui-surface S2), so the state is owned here rather
  // than inside ItemAncillaryPanel (this app has no portal mechanism; mirrors
  // PrescriptionDetailView's top-level edit-state pattern).
  const [ancillaryEditor, setAncillaryEditor] = createSignal<
    AncillaryEditorState | undefined
  >();
  // The Variants tab's add/edit modal — same reasoning as ancillaryEditor
  // above (the "Add variant" trigger is a page-header action, ui-surface S2).
  const [variantEditor, setVariantEditor] = createSignal<
    ItemVariantEditorState | undefined
  >();

  const [data] = createResource(
    () => ({ storeId: params.storeId, itemId: params.itemId }),
    async v => {
      const result = await graphqlFetch(ItemDetail, {
        storeId: v.storeId,
        id: { equalTo: v.itemId },
      });
      if (result.kind !== 'success') return undefined;
      // Empty page = unknown or inactive item → not-found (OMS-REG-CAT-04.32).
      return result.data.items.nodes[0];
    }
  );
  // Read WITHOUT suspending — the same read every tab panel below uses. This
  // is the screen's first load, so a suspending read would be tolerable here,
  // but keeping it non-suspending means NOTHING on this screen can trip the
  // boundary below: `data.loading` drives the spinner instead.
  const item = (): ItemDetailRow | undefined => gated(data);

  const backToList = () => {
    // Replace history so Back can't return to the missing record
    // (OMS-REG-CAT-04.32).
    navigate(`/${params.storeId}/catalogue/items`, { replace: true });
  };

  const tabs = (): TabDef[] => visibleTabs(isCentralServer());

  const stockHref = () =>
    `/${params.storeId}/inventory/stock?itemId=${params.itemId}`;

  // Column config for the Master lists tab's table — also what puts the Columns
  // + Settings controls in its toolbar (DataTable renders both only when
  // `setConfig` is wired), so a table without it silently loses them.
  const masterListsConfig = createTableConfig({
    tableId: 'item-master-lists',
  });

  // Not sortable: these rows ride along with the item record (no query of their
  // own), and the shared table sorts server-side only (ui-standards § tables →
  // pagination & scale) — there is no client-side sort to offer.
  //
  // createMemo, NOT a plain function: TanStack memoizes on this array's
  // REFERENCE, so a fresh one per read invalidates four layers of its internal
  // memo chain (kdd/solid-reactivity-pitfalls §14).
  const masterListColumns = createMemo((): Column<MasterListRow, never>[] => [
    {
      c: { key: 'code' },
      header: () => t('label.code'),
      enableSorting: false,
      ...getCellDefinition('code'),
    },
    {
      c: { key: 'name' },
      header: () => t('label.name'),
      enableSorting: false,
      ...getCellDefinition('name'),
    },
    {
      c: { key: 'description' },
      header: () => t('label.description'),
      enableSorting: false,
      ...getCellDefinition('description'),
    },
  ]);

  return (
    // A BACKSTOP, not the load treatment: every read on this screen — the
    // record above and each tab panel's own resource — is `.state`-gated and so
    // never suspends, and `data.loading` below drives the spinner. The boundary
    // stays only so a future suspending read degrades to a spinner here instead
    // of bubbling to the router's fallback-less boundary and blanking the page
    // (#160/#196).
    <Suspense fallback={<Spinner center />}>
      <Show
        when={item()}
        fallback={
          <Show when={!data.loading} fallback={<Spinner center />}>
            {/* Not-found blocking notice — confirm returns to the list (OMS-REG-CAT-04.32). */}
            <ConfirmDialog
              open
              title={t('error.item-not-found')}
              message={t('messages.click-to-return-to-item-list')}
              onConfirm={backToList}
              onClose={backToList}
            />
          </Show>
        }
      >
        {i => (
          <Tabs value={activeTab()} onValueChange={tab => setSearch({ tab })}>
            <Page
              fillBody
              header={
                <Header>
                  <Breadcrumb
                    crumbs={[
                      {
                        label: t('items'),
                        to: `/${params.storeId}/catalogue/items`,
                      },
                      { label: i().name },
                    ]}
                  />
                  {/* ONE page-action cluster (ui-surface S2) — the header has a
                      single inline-end region, so the per-tab actions live
                      inside it rather than each bringing its own. Both are
                      central-server only; only one tab is ever active, so at
                      most one button shows. */}
                  <HeaderButtons>
                    <Show
                      when={activeTab() === 'ancillary' && isCentralServer()}
                    >
                      <Button
                        icon={<PlusCircleIcon />}
                        onClick={() => setAncillaryEditor({ mode: 'create' })}
                      >
                        {t('label.add-ancillary-item')}
                      </Button>
                    </Show>
                    {/* The Variants tab is already central-only
                        (itemDetailTabs.ts), so this only checks the active
                        tab. */}
                    <Show
                      when={activeTab() === 'variants' && isCentralServer()}
                    >
                      <Button
                        icon={<PlusCircleIcon />}
                        onClick={() => setVariantEditor({ mode: 'create' })}
                      >
                        {t('label.add-variant')}
                      </Button>
                    </Show>
                  </HeaderButtons>
                  {/* Statistics band (spec/items S2) — in the header's toolbar
                      row, above the tab strip, mirroring the old app's
                      AppBarContent slot. It has to sit here rather than in the
                      content body: the tab strip claims the header's bottom
                      edge, so a band in the body would render BELOW the strip,
                      not above it as the spec's order requires. The Toolbar's
                      own flex-wrap row lays the panels out inline (compact,
                      content-sized), wrapping on narrow viewports. Only the
                      stock-on-hand stats drill down (to the stock register);
                      AMC and months-of-stock have no destination, so they take
                      no href and render as plain text. */}
                  <Toolbar>
                    <StatsPanel
                      title={t('title.stock-on-hand')}
                      titleHref={stockHref()}
                      state={{ status: 'ready' }}
                    >
                      <Statistic
                        label={t('label.units')}
                        value={formatUnits(i().stats.stockOnHand)}
                        href={stockHref()}
                      />
                      <Show when={i().isVaccine}>
                        <Statistic
                          label={t('label.doses')}
                          value={formatUnits(
                            dosesEquivalent(i().stats.stockOnHand, i().doses)
                          )}
                          href={stockHref()}
                        />
                      </Show>
                    </StatsPanel>
                    <StatsPanel
                      title={t('title.average-monthly-consumption')}
                      state={{ status: 'ready' }}
                    >
                      <Statistic
                        label={t('label.units')}
                        value={formatUnits(
                          i().stats.averageMonthlyConsumption,
                          2
                        )}
                      />
                    </StatsPanel>
                    <StatsPanel
                      title={t('title.months-of-stock')}
                      state={{ status: 'ready' }}
                    >
                      <Statistic
                        label={t('text.months')}
                        value={formatMonthsOfStock(
                          i().stats.monthsOfStockOnHand
                        )}
                      />
                    </StatsPanel>
                  </Toolbar>
                  <TabList tabs={tabs()} />
                </Header>
              }
            >
              <TabPanel value="general">
                {/* `padded`: this page is fillBody (so the Ledger / Master
                    lists / Ancillary tables fill the region and own their
                    scroll), which strips the Page body's edge padding — the
                    exact mixed table+form detail view ContentContainer's
                    padded mode exists for. Without it the form sits flush
                    against the tab strip. */}
                <ContentContainer size="form" padded>
                  {/* Two-column groups (spec S2 › General) of read-only
                      labelled values (no input chrome — spec D67). Column 1
                      then column 2 preserves the spec's group order when the
                      columns wrap to one. */}
                  <FormColumns>
                    <FormColumn>
                      <FormSection title={t('title.details')}>
                        <FormRow>
                          <LabelledValue
                            variant="field"
                            label={t('label.name')}
                          >
                            {i().name}
                          </LabelledValue>
                          <LabelledValue
                            variant="field"
                            label={t('label.code')}
                          >
                            {i().code}
                          </LabelledValue>
                        </FormRow>
                        <FormRow>
                          <LabelledValue
                            variant="field"
                            label={t('label.unit')}
                          >
                            {i().unitName ?? ''}
                          </LabelledValue>
                          <LabelledValue
                            variant="field"
                            label={t('label.strength')}
                          >
                            {i().strength ?? ''}
                          </LabelledValue>
                        </FormRow>
                        <FormRow>
                          <LabelledValue variant="field" label={t('label.ddd')}>
                            {i().ddd}
                          </LabelledValue>
                          <LabelledValue
                            variant="field"
                            label={t('label.type')}
                          >
                            {i().type}
                          </LabelledValue>
                        </FormRow>
                        <FormRow>
                          <LabelledValue
                            variant="field"
                            label={t('label.is-vaccine')}
                          >
                            {i().isVaccine
                              ? t('messages.yes')
                              : t('messages.no')}
                          </LabelledValue>
                          <Show when={i().isVaccine}>
                            <LabelledValue
                              variant="field"
                              label={t('label.doses')}
                            >
                              {formatUnits(i().doses)}
                            </LabelledValue>
                          </Show>
                        </FormRow>
                      </FormSection>
                      <FormSection title={t('title.categories')}>
                        <FormRow>
                          <LabelledValue
                            variant="field"
                            label={t('label.atc-category')}
                          >
                            {i().atcCategory}
                          </LabelledValue>
                          <LabelledValue
                            variant="field"
                            label={t('label.universal-name')}
                          >
                            {i().msupplyUniversalName}
                          </LabelledValue>
                        </FormRow>
                        <FormRow>
                          <LabelledValue
                            variant="field"
                            label={t('label.universal-code')}
                          >
                            {i().universalCode}
                          </LabelledValue>
                        </FormRow>
                      </FormSection>
                    </FormColumn>
                    <FormColumn>
                      <FormSection title={t('title.storage')}>
                        {/* The restricted location type by name (spec S2 ›
                            Storage) — a read-only value, no longer a lookup. */}
                        <FormRow>
                          <LabelledValue
                            variant="field"
                            label={t('label.location-type')}
                          >
                            {i().restrictedLocationType?.name ?? ''}
                          </LabelledValue>
                        </FormRow>
                      </FormSection>
                      <FormSection title={t('title.packaging')}>
                        <FormRow>
                          <LabelledValue
                            variant="field"
                            label={t('label.default-pack-size')}
                          >
                            {formatUnits(i().defaultPackSize)}
                          </LabelledValue>
                          <LabelledValue
                            variant="field"
                            label={t('label.outer-pack-size')}
                          >
                            {formatUnits(i().outerPackSize)}
                          </LabelledValue>
                        </FormRow>
                        <FormRow>
                          <LabelledValue
                            variant="field"
                            label={t('label.volume-per-pack')}
                          >
                            {formatUnits(i().volumePerPack, 2)}
                          </LabelledValue>
                          <LabelledValue
                            variant="field"
                            label={t('label.volume-per-outer-pack')}
                          >
                            {formatUnits(i().volumePerOuterPack, 2)}
                          </LabelledValue>
                        </FormRow>
                        <FormRow>
                          <LabelledValue
                            variant="field"
                            label={t('label.weight')}
                          >
                            {formatUnits(i().weight, 2)}
                          </LabelledValue>
                        </FormRow>
                      </FormSection>
                      <FormSection title={t('title.pricing')}>
                        <FormRow>
                          <LabelledValue
                            variant="field"
                            label={t('label.margin')}
                          >
                            {formatUnits(i().margin, 2)}
                          </LabelledValue>
                        </FormRow>
                      </FormSection>
                    </FormColumn>
                  </FormColumns>
                </ContentContainer>
              </TabPanel>

              <TabPanel value="store">
                {/* Padded for the same reason as the General tab above. */}
                <ContentContainer size="form" padded>
                  <FormColumns>
                    <FormColumn>
                      <FormSection title={t('title.pricing')}>
                        <FormRow>
                          <LabelledValue
                            variant="field"
                            label={t('label.default-sell-price-per-pack')}
                          >
                            {formatUnits(
                              i().itemStoreProperties
                                ?.defaultSellPricePerPack ?? 0,
                              2
                            )}
                          </LabelledValue>
                        </FormRow>
                      </FormSection>
                      <FormSection title={t('title.ordering')}>
                        <FormRow>
                          <LabelledValue
                            variant="field"
                            label={t('label.ignore-for-orders')}
                          >
                            {(i().itemStoreProperties?.ignoreForOrders ?? false)
                              ? t('messages.yes')
                              : t('messages.no')}
                          </LabelledValue>
                        </FormRow>
                      </FormSection>
                    </FormColumn>
                  </FormColumns>
                </ContentContainer>
              </TabPanel>

              <TabPanel value="master-lists">
                {/* No <Show> wrapper: the DataTable owns its own empty
                    treatment, and gating on the row count would hide the
                    column headers with it (ui-standards § tables → empty &
                    loading: the header row stays visible and the empty state
                    fills the body below it). */}
                <DataTable
                  columns={masterListColumns()}
                  rows={i().masterLists ?? []}
                  rowKey={row => row.id}
                  emptyMessage={t('error.no-master-list')}
                  config={masterListsConfig.config()}
                  setConfig={masterListsConfig.setConfig}
                  configIsDefault={masterListsConfig.isConfigDefault()}
                  onSaveGlobalDefault={
                    masterListsConfig.canSaveGlobalDefault()
                      ? masterListsConfig.saveGlobalTableConfig
                      : undefined
                  }
                />
              </TabPanel>

              <TabPanel value="ledger">
                <ItemLedgerPanel
                  storeId={params.storeId}
                  itemId={params.itemId}
                />
              </TabPanel>

              <TabPanel value="ancillary">
                <ItemAncillaryPanel
                  storeId={params.storeId}
                  itemId={params.itemId}
                  isCentral={isCentralServer()}
                  editor={ancillaryEditor()}
                  onEditorChange={setAncillaryEditor}
                />
              </TabPanel>

              <TabPanel value="custom-fields">
                {/* Read-only custom fields for the item scope (item.custom_fields
                    is server read-only) — the shared view. */}
                <CustomFieldsView scope="item" values={i().customFields} />
              </TabPanel>

              <Show when={isCentralServer()}>
                <TabPanel value="variants">
                  {/* Gated here too (not just in tabs()) so a stale ?tab=
                      param on a remote site can't render central content. */}
                  <ItemVariantsPanel
                    storeId={params.storeId}
                    itemId={params.itemId}
                    isVaccine={i().isVaccine}
                    editor={variantEditor()}
                    onEditorChange={setVariantEditor}
                  />
                </TabPanel>
              </Show>

              <TabPanel value="log">
                <ActivityLogPanel storeId={params.storeId} recordId={i().id} />
              </TabPanel>
            </Page>
          </Tabs>
        )}
      </Show>
    </Suspense>
  );
};

export default ItemDetailView;
