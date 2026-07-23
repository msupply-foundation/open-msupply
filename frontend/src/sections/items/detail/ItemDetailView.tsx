import {
  createResource,
  For,
  Show,
  Suspense,
  type Component,
  type JSX,
} from 'solid-js';
import { useNavigate, useParams, useSearchParams } from '@solidjs/router';
import { graphqlFetch } from '../../../api/graphql';
import { t } from '../../../intl';
import { localisedDate } from '../../../intl/formatDateTime';
import { Page } from '../../../ui/layout/Page/Page';
import { Header } from '../../../ui/layout/Header/Header';
import { Breadcrumb } from '../../../ui/layout/Header/Breadcrumb';
import { CardGrid } from '../../../ui/layout/CardGrid/CardGrid';
import {
  Tabs,
  TabList,
  TabPanel,
  type TabDef,
} from '../../../ui/elements/tabs/Tabs';
import { StatsPanel } from '../../../ui/elements/dashboard/StatsPanel';
import { Statistic } from '../../../ui/elements/dashboard/Statistic';
import { LabelledValue } from '../../../ui/elements/typography/LabelledValue';
import { Text } from '../../../ui/elements/typography/Text';
import { Spinner } from '../../../ui/elements/feedback/Spinner';
import { EmptyState } from '../../../ui/elements/feedback/EmptyState';
import { ConfirmDialog } from '../../../ui/elements/feedback/ConfirmDialog';
import { DataTable, type Column } from '../../../ui/elements/table/DataTable';
import { getBooleanCell } from '../../../ui/elements/table/BooleanCell';
import { ActivityLogPanel } from '../../../domain/activityLog';
import { ItemDetail, type ItemDetailResult } from './itemDetail.generated';
import { ItemCustomFieldDefinitions } from '../itemCustomFields.generated';
import {
  formatMonthsOfStock,
  formatUnits,
  dosesEquivalent,
} from '../list/itemStats';

// The item detail screen (spec/items S2). Read-only: every field renders as a
// disabled/read-only value; the only writes are the central-only management
// flows (S3–S5), which are NOT built in this pass (flagged in BUILD_REPORT).
// Statistics band + URL-driven tabs (a tab is deep-linkable via ?tab=).
//
// Built tabs: General, Store, Master lists, Custom fields, Log. Flagged tabs
// (rendered as a placeholder pending their components): Ledger (needs the
// date-time-range filter field), Ancillary items (needs the central-only
// modals), Variants (needs the variant card + editable packaging grid).

type ItemDetailRow = NonNullable<ItemDetailResult['items']['nodes'][number]>;
type MasterListRow = NonNullable<ItemDetailRow['masterLists']>[number];

const ItemDetailView: Component = () => {
  const params = useParams<{ storeId: string; itemId: string }>();
  const navigate = useNavigate();
  const [search, setSearch] = useSearchParams<{ tab?: string }>();
  const activeTab = () => search.tab ?? 'general';

  const [data] = createResource(
    () => ({ storeId: params.storeId, itemId: params.itemId }),
    async v => {
      const result = await graphqlFetch(ItemDetail, {
        storeId: v.storeId,
        id: { equalTo: v.itemId },
      });
      if (result.kind !== 'success') return undefined;
      // Empty page = unknown or inactive item → not-found (AC-L9).
      return result.data.items.nodes[0];
    }
  );
  const item = (): ItemDetailRow | undefined => data.latest;

  const [defsData] = createResource(async () => {
    const result = await graphqlFetch(ItemCustomFieldDefinitions, {});
    if (result.kind !== 'success') return [];
    return result.data.customFields.nodes.filter(
      d => d.displayMode !== 'HIDDEN'
    );
  });
  const visibleDefs = () => defsData.latest ?? [];

  const backToList = () => {
    // Replace history so Back can't return to the missing record (AC-L9).
    navigate(`/${params.storeId}/catalogue/items`, { replace: true });
  };

  const tabs = (): TabDef[] => [
    { value: 'general', label: t('label.general') },
    { value: 'store', label: t('label.store') },
    { value: 'master-lists', label: t('label.master-lists') },
    { value: 'ledger', label: t('label.ledger') },
    { value: 'ancillary', label: t('title.ancillary-supplies') },
    { value: 'custom-fields', label: t('label.custom-fields') },
    { value: 'log', label: t('label.log') },
  ];

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

  const customFieldValue = (key: string): unknown =>
    (item()?.customFields as Record<string, unknown> | null | undefined)?.[key];

  return (
    <Suspense fallback={<Spinner center />}>
      <Show
        when={item()}
        fallback={
          <Show when={!data.loading} fallback={<Spinner center />}>
            {/* Not-found blocking notice — confirm returns to the list (AC-L9). */}
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
                <DetailGroup title={t('title.details')}>
                  <LabelledValue variant="field" label={t('label.name')}>
                    {i().name}
                  </LabelledValue>
                  <LabelledValue variant="field" label={t('label.code')}>
                    {i().code}
                  </LabelledValue>
                  <LabelledValue variant="field" label={t('label.unit')}>
                    {i().unitName ?? ''}
                  </LabelledValue>
                  <LabelledValue variant="field" label={t('label.strength')}>
                    {i().strength ?? ''}
                  </LabelledValue>
                  <LabelledValue variant="field" label={t('label.ddd')}>
                    {i().ddd}
                  </LabelledValue>
                  <LabelledValue variant="field" label={t('label.type')}>
                    {i().type}
                  </LabelledValue>
                  <LabelledValue variant="field" label={t('label.is-vaccine')}>
                    {i().isVaccine ? t('messages.yes') : t('messages.no')}
                  </LabelledValue>
                  <Show when={i().isVaccine}>
                    <LabelledValue variant="field" label={t('label.doses')}>
                      {formatUnits(i().doses)}
                    </LabelledValue>
                  </Show>
                </DetailGroup>
                <DetailGroup title={t('title.categories')}>
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
                  <LabelledValue
                    variant="field"
                    label={t('label.universal-code')}
                  >
                    {i().universalCode}
                  </LabelledValue>
                </DetailGroup>
                <DetailGroup title={t('title.storage')}>
                  <LabelledValue
                    variant="field"
                    label={t('label.location-type')}
                  >
                    {i().restrictedLocationType?.name ?? ''}
                  </LabelledValue>
                </DetailGroup>
                <DetailGroup title={t('title.packaging')}>
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
                  <LabelledValue variant="field" label={t('label.weight')}>
                    {formatUnits(i().weight, 2)}
                  </LabelledValue>
                </DetailGroup>
                <DetailGroup title={t('title.pricing')}>
                  <LabelledValue variant="field" label={t('label.margin')}>
                    {formatUnits(i().margin, 2)}
                  </LabelledValue>
                </DetailGroup>
              </TabPanel>

              <TabPanel value="store">
                <DetailGroup title={t('title.pricing')}>
                  <LabelledValue
                    variant="field"
                    label={t('label.default-sell-price-per-pack')}
                  >
                    {formatUnits(
                      i().itemStoreProperties?.defaultSellPricePerPack ?? 0,
                      2
                    )}
                  </LabelledValue>
                </DetailGroup>
                <DetailGroup title={t('title.ordering')}>
                  <LabelledValue
                    variant="field"
                    label={t('label.ignore-for-orders')}
                  >
                    {i().itemStoreProperties?.ignoreForOrders
                      ? t('messages.yes')
                      : t('messages.no')}
                  </LabelledValue>
                </DetailGroup>
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
                {/* FLAGGED (BUILD_REPORT): the ledger needs a date-time-range
                    FilterBar field (not built) + the itemLedger query wiring. */}
                <EmptyState message={t('messages.no-item-ledger')} />
              </TabPanel>

              <TabPanel value="ancillary">
                {/* FLAGGED (BUILD_REPORT): central-only add/edit/delete modals
                    (S5) not built; read-only listing pending the ratio columns. */}
                <EmptyState message={t('messages.no-ancillary-items')} />
              </TabPanel>

              <TabPanel value="custom-fields">
                <Show
                  when={visibleDefs().length > 0}
                  fallback={
                    <EmptyState message={t('messages.no-custom-fields')} />
                  }
                >
                  <DetailGroup title={t('label.custom-fields')}>
                    <For each={visibleDefs()}>
                      {def => (
                        <LabelledValue variant="field" label={def.name}>
                          {renderCustomFieldValue(
                            def,
                            customFieldValue(def.key)
                          )}
                        </LabelledValue>
                      )}
                    </For>
                  </DetailGroup>
                </Show>
              </TabPanel>

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

// A read-only field group — a heading over stacked LabelledValue rows. Composes
// existing primitives (the dedicated two-column DetailSection scaffold isn't in
// main yet — flagged in BUILD_REPORT; single-column stacking here).
const DetailGroup = (props: { title: string; children: JSX.Element }) => (
  <section>
    <Text variant="heading">{props.title}</Text>
    {props.children}
  </section>
);

const renderCustomFieldValue = (
  def: {
    valueType: string;
    options: { id: string; key: string; name: string }[];
  },
  value: unknown
): string => {
  if (value == null) return '';
  switch (def.valueType) {
    case 'BOOLEAN':
      return value ? t('messages.yes') : t('messages.no');
    case 'OPTION': {
      const match = def.options.find(o => o.id === value || o.key === value);
      return match?.name ?? String(value);
    }
    case 'DATE':
      return localisedDate(value as string);
    default:
      return String(value);
  }
};

// getBooleanCell is imported for parity with the list's custom-field columns;
// the custom-fields tab shows values as read-only text (spec/items S2). Keep
// the import referenced to avoid an unused-import error while the tab evolves.
void getBooleanCell;

export default ItemDetailView;
