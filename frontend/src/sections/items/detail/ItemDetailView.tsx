import {
  createResource,
  createSignal,
  Show,
  Suspense,
  type Component,
} from 'solid-js';
import { useNavigate, useParams, useSearchParams } from '@solidjs/router';
import { graphqlFetch } from '../../../api/graphql';
import { isCentralServer } from '../../../api/serverInfo';
import { t } from '../../../intl';
import { Page } from '../../../ui/layout/Page/Page';
import { Header } from '../../../ui/layout/Header/Header';
import { Breadcrumb } from '../../../ui/layout/Header/Breadcrumb';
import { HeaderButtons } from '../../../ui/layout/Header/HeaderButtons';
import { CardGrid } from '../../../ui/layout/CardGrid/CardGrid';
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
import { DetailContainer } from '../../../ui/layout/Detail/DetailContainer';
import { DetailSection } from '../../../ui/layout/Detail/DetailSection';
import { DetailRow } from '../../../ui/layout/Detail/DetailRow';
import { FormColumns } from '../../../ui/layout/Form/FormColumns';
import { FormColumn } from '../../../ui/layout/Form/FormColumn';
import { Select } from '../../../ui/elements/selectors/Select';
import { Spinner } from '../../../ui/elements/feedback/Spinner';
import { EmptyState } from '../../../ui/elements/feedback/EmptyState';
import { ConfirmDialog } from '../../../ui/elements/feedback/ConfirmDialog';
import { DataTable, type Column } from '../../../ui/elements/table/DataTable';
import { ActivityLogPanel } from '../../../domain/activityLog';
import { CustomFieldsView } from '../../../domain/customFields';
import { ItemDetail, type ItemDetailResult } from './itemDetail.generated';
import { ItemLedgerPanel } from './ItemLedgerPanel';
import { ItemAncillaryPanel } from './ItemAncillaryPanel';
import type { AncillaryEditorState } from './AncillaryItemEditModal';
import { visibleTabs } from './itemDetailTabs';
import {
  formatMonthsOfStock,
  formatUnits,
  dosesEquivalent,
} from '../list/itemStats';

// The item detail screen (spec/items S2). Read-only: every field renders as a
// disabled control on the shared detail-form scaffold (ui-standards
// detail-views: DetailContainer/DetailSection/DetailRow — the names vertical
// is the live reference); the only writes are the central-only management
// flows (S3–S5), which are NOT built in this pass (flagged in BUILD_REPORT).
// Statistics band + URL-driven tabs (a tab is deep-linkable via ?tab=).
// The General tab's two-column section pairing (spec: "two-column, groups in
// order") reuses the pure-layout FormColumns/FormColumn row — column 1 then
// column 2 preserves the spec's group order when the columns wrap to one.
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
  const item = (): ItemDetailRow | undefined => data.latest;

  const backToList = () => {
    // Replace history so Back can't return to the missing record (OMS-REG-CAT-04.32).
    navigate(`/${params.storeId}/catalogue/items`, { replace: true });
  };

  const tabs = (): TabDef[] => visibleTabs(isCentralServer());

  const stockHref = () =>
    `/${params.storeId}/inventory/stock?itemId=${params.itemId}`;
  const selfHref = () => `/${params.storeId}/catalogue/items/${params.itemId}`;

  const masterListColumns = (): Column<MasterListRow, never>[] => [
    { c: { key: 'code' }, header: t('label.code'), enableSorting: false },
    { c: { key: 'name' }, header: t('label.name'), enableSorting: false },
    {
      c: { key: 'description' },
      header: t('label.description'),
      enableSorting: false,
    },
  ];

  return (
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
              confirmLabel={t('button.ok')}
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
                  {/* Ancillary items' page action (ui-surface S2) — central
                      server only, and only while that tab is active. */}
                  <Show when={activeTab() === 'ancillary' && isCentralServer()}>
                    <HeaderButtons>
                      <Button
                        icon={<PlusCircleIcon />}
                        onClick={() => setAncillaryEditor({ mode: 'create' })}
                      >
                        {t('label.add-ancillary-item')}
                      </Button>
                    </HeaderButtons>
                  </Show>
                  <TabList tabs={tabs()} />
                </Header>
              }
            >
              {/* Statistics band (spec/items S2). Only the stock-on-hand panel's
                  title links to the stock register; AMC/MOS have no drill-down
                  (a Statistic requires an href, so they self-link). */}
              <CardGrid>
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
                    value={formatUnits(i().stats.averageMonthlyConsumption, 2)}
                    href={selfHref()}
                  />
                </StatsPanel>
                <StatsPanel
                  title={t('title.months-of-stock')}
                  state={{ status: 'ready' }}
                >
                  <Statistic
                    label={t('text.months')}
                    value={formatMonthsOfStock(i().stats.monthsOfStockOnHand)}
                    href={selfHref()}
                  />
                </StatsPanel>
              </CardGrid>

              <TabPanel value="general">
                <DetailContainer>
                  {/* Two-column groups (spec S2 › General), paired with the
                      pure-layout column row. minWidth 18rem so two columns fit
                      the DetailContainer measure (the 22rem default would
                      always wrap to one); reading order when wrapped stays the
                      spec's group order. */}
                  <FormColumns>
                    <FormColumn minWidth="18rem">
                      <DetailSection title={t('title.details')}>
                        <DetailRow label={t('label.name')} value={i().name} />
                        <DetailRow label={t('label.code')} value={i().code} />
                        <DetailRow
                          label={t('label.unit')}
                          value={i().unitName ?? ''}
                        />
                        <DetailRow
                          label={t('label.strength')}
                          value={i().strength ?? ''}
                        />
                        <DetailRow label={t('label.ddd')} value={i().ddd} />
                        <DetailRow label={t('label.type')} value={i().type} />
                        <DetailRow
                          label={t('label.is-vaccine')}
                          checked={i().isVaccine}
                        />
                        <Show when={i().isVaccine}>
                          <DetailRow
                            label={t('label.doses')}
                            value={formatUnits(i().doses)}
                          />
                        </Show>
                      </DetailSection>
                      <DetailSection title={t('title.categories')}>
                        <DetailRow
                          label={t('label.atc-category')}
                          value={i().atcCategory}
                        />
                        <DetailRow
                          label={t('label.universal-name')}
                          value={i().msupplyUniversalName}
                        />
                        <DetailRow
                          label={t('label.universal-code')}
                          value={i().universalCode}
                        />
                      </DetailSection>
                    </FormColumn>
                    <FormColumn minWidth="18rem">
                      <DetailSection title={t('title.storage')}>
                        {/* Disabled lookup naming the restricted location type
                        (spec S2 › Storage: a disabled autocomplete — the
                        read-only lookup rendering; it never opens). */}
                        <DetailRow
                          label={t('label.location-type')}
                          control={
                            <Select
                              label={t('label.location-type')}
                              hideLabel
                              disabled
                              width="full"
                              placeholder=""
                              options={
                                i().restrictedLocationType
                                  ? [
                                      {
                                        value: i().restrictedLocationType!.id,
                                        label: i().restrictedLocationType!.name,
                                      },
                                    ]
                                  : []
                              }
                              value={i().restrictedLocationType?.id}
                            />
                          }
                        />
                      </DetailSection>
                      <DetailSection title={t('title.packaging')}>
                        <DetailRow
                          label={t('label.default-pack-size')}
                          value={formatUnits(i().defaultPackSize)}
                        />
                        <DetailRow
                          label={t('label.outer-pack-size')}
                          value={formatUnits(i().outerPackSize)}
                        />
                        <DetailRow
                          label={t('label.volume-per-pack')}
                          value={formatUnits(i().volumePerPack, 2)}
                        />
                        <DetailRow
                          label={t('label.volume-per-outer-pack')}
                          value={formatUnits(i().volumePerOuterPack, 2)}
                        />
                        <DetailRow
                          label={t('label.weight')}
                          value={formatUnits(i().weight, 2)}
                        />
                      </DetailSection>
                      <DetailSection title={t('title.pricing')}>
                        <DetailRow
                          label={t('label.margin')}
                          value={formatUnits(i().margin, 2)}
                        />
                      </DetailSection>
                    </FormColumn>
                  </FormColumns>
                </DetailContainer>
              </TabPanel>

              <TabPanel value="store">
                <DetailContainer>
                  <DetailSection title={t('title.pricing')}>
                    <DetailRow
                      label={t('label.default-sell-price-per-pack')}
                      value={formatUnits(
                        i().itemStoreProperties?.defaultSellPricePerPack ?? 0,
                        2
                      )}
                    />
                  </DetailSection>
                  <DetailSection title={t('title.ordering')}>
                    <DetailRow
                      label={t('label.ignore-for-orders')}
                      checked={
                        i().itemStoreProperties?.ignoreForOrders ?? false
                      }
                    />
                  </DetailSection>
                </DetailContainer>
              </TabPanel>

              <TabPanel value="master-lists">
                <Show
                  when={(i().masterLists?.length ?? 0) > 0}
                  fallback={<EmptyState message={t('error.no-master-list')} />}
                >
                  <DataTable
                    columns={masterListColumns()}
                    rows={i().masterLists ?? []}
                    rowKey={row => row.id}
                    emptyMessage={t('error.no-master-list')}
                  />
                </Show>
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
                  {/* FLAGGED (BUILD_REPORT): the variant card + editable
                      packaging grid aren't built yet — this slice only wires
                      the tab's central-only PRESENCE (OMS-REG-CAT-05.1/.2).
                      Gated here too (not just in tabs()) so a stale ?tab=
                      param on a remote site can't render central content. */}
                  <EmptyState message={t('messages.no-item-variants')} />
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
