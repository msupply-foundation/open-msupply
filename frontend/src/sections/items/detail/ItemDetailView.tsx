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
import { ContentContainer } from '../../../ui/layout/ContentContainer/ContentContainer';
import { FormColumns } from '../../../ui/layout/Form/FormColumns';
import { FormColumn } from '../../../ui/layout/Form/FormColumn';
import { FormSection } from '../../../ui/layout/Form/FormSection';
import { FormRow } from '../../../ui/layout/Form/FormRow';
import { LabelledValue } from '../../../ui/elements/typography/LabelledValue';
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
                <ContentContainer size="form">
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
                <ContentContainer size="form">
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
