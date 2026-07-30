import {
  createMemo,
  createResource,
  createSignal,
  Show,
  Suspense,
} from 'solid-js';
import type { Component } from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import { graphqlFetch } from '../../../api/graphql';
import { t } from '../../../intl';
import { Page } from '../../../ui/layout/Page/Page';
import { Header } from '../../../ui/layout/Header/Header';
import { Breadcrumb } from '../../../ui/layout/Header/Breadcrumb';
import { HeaderButtons } from '../../../ui/layout/Header/HeaderButtons';
import { HeaderToolbar } from '../../../ui/layout/Header/HeaderToolbar';
import { createSidePanelOpen } from '../../../ui/layout/SidePanel/createSidePanelOpen';
import { Button } from '../../../ui/elements/buttons/Button';
import { Alert } from '../../../ui/elements/feedback/Alert';
import { Spinner } from '../../../ui/elements/feedback/Spinner';
import {
  Tabs,
  TabList,
  TabPanel,
  type TabDef,
} from '../../../ui/elements/tabs/Tabs';
import { PlusCircleIcon, SidebarIcon } from '../../../ui/icons';
import {
  DataTable,
  type CardGroup,
  type Column,
} from '../../../ui/elements/table/DataTable';
import {
  getCellDefinition,
  getNumberCell,
} from '../../../ui/elements/table/tableHelpers';
import { remToPx } from '../../../ui/utils/rem';
import { createTableConfig } from '../../../api/createTableConfig';
import { createDebouncedEdit } from '../../../domain/debouncedEdit';
import {
  CustomFieldsEditTab,
  CustomFieldsToolbar,
} from '../../../domain/customFields';
import {
  CustomerReturnDetail,
  type CustomerReturnInfoFragment,
  type CustomerReturnLineFragment,
  type UpdateCustomerReturnVariables,
} from './customerReturnDetail.generated';
import { CustomerReturnPreferences } from '../preferences.generated';
import { CustomerReturnToolbar } from './CustomerReturnToolbar';
import { CustomerReturnSidePanel } from './CustomerReturnSidePanel';
import { CustomerReturnStatusFooter } from './CustomerReturnStatusFooter';
import { LogTab } from './LogTab';
import {
  ReturnItemsModal,
  type ReturnItem,
  type ReturnLinesSaved,
} from './edit-modal/ReturnItemsModal';
import { isReturnDisabled, returnKind } from './returnStatus';
import { saveReturnFields } from './returnUpdate';
import type { ReturnEditFields } from './returnEdit';
import { ExportPrintAction } from './actions/ExportPrintAction';

// The customer-return detail view (spec/customer-returns/ui-surface.md S3):
// toolbar (customer / reference / kind banner), Details | Log tabs, the
// read-only line table grouped by item (row click → the return-items modal),
// the Additional-info side panel, and the status footer (hold / lifecycle /
// close / advance). Every edit affordance shares the one editability gate
// (rules § editability; OMS-REG-DIST-07.26): a VERIFIED return — or a transfer return still
// in the sender's hands — is read-only.

type Line = CustomerReturnLineFragment;

// Card view (below 600px): the item name is the card title (headerPosition
// 'primary') and the packs returned its badge; Code / Batch / Expiry / Unit
// form the always-shown default group and every remaining column drops into
// one collapsed "More details" disclosure (ui-standards → CARD_TABLE_MODEL).
type GroupKey = 'more';
const CARD_GROUPS: CardGroup<Line, GroupKey>[] = [
  { key: 'more', disclosure: 'closed' },
];

const CustomerReturnDetailView: Component = () => {
  const params = useParams<{ storeId: string; returnId: string }>();
  const navigate = useNavigate();
  // The shared side-panel open state: responsive default (open on a wide
  // viewport) with the user's explicit choice persisted — the same helper every
  // other detail screen uses.
  const [sidePanelOpen, setSidePanelOpen] = createSidePanelOpen();
  const [customerError, setCustomerError] = createSignal<string | undefined>();

  type EditState =
    { mode: 'update'; itemId: string } | { mode: 'add' } | undefined;
  const [editState, setEditState] = createSignal<EditState>();

  const tableConfig = createTableConfig({
    tableId: 'customer-return-detail',
    defaultConfig: {
      base: {
        columnVisibility: { volumePerPack: false },
      },
    },
  });

  // Fetch the return. A NodeError (bad id) is promoted to the global
  // unexpected-error modal; a non-return invoice id is treated the same. The
  // resource IS the local state: every save writes back with `mutate`
  // (kdd/state-management).
  const [data, { mutate }] = createResource(
    () => ({ storeId: params.storeId, id: params.returnId }),
    async variables => {
      const result = await graphqlFetch(CustomerReturnDetail, variables, {
        mapSuccessToError: d =>
          d.invoice.__typename === 'NodeError'
            ? d.invoice.error.description
            : undefined,
      });
      if (result.kind !== 'success') return undefined;
      return result.data.invoice.__typename === 'InvoiceNode'
        ? result.data.invoice
        : undefined;
    }
  );

  const info = (): CustomerReturnInfoFragment | undefined => data();
  const rows = (): Line[] => data()?.lines.nodes ?? [];
  const hasLines = () => rows().length > 0;

  // The store preferences the status controls key off (rules § preference
  // gates). `.latest` — never suspends; empty = no restriction while loading.
  const [prefs] = createResource(
    () => params.storeId,
    async storeId => {
      const result = await graphqlFetch(CustomerReturnPreferences, { storeId });
      if (result.kind !== 'success') return undefined;
      return result.data.preferences;
    }
  );
  // NON-suspending read (kdd/solid-reactivity-pitfalls § no remounts on
  // interaction): the page body renders as soon as the return resolves, so a
  // still-pending preferences read must never suspend this screen's boundary —
  // `.latest` alone would, on its first pending read. Empty = no restriction.
  const statusOptions = () =>
    prefs.state === 'ready' || prefs.state === 'refreshing'
      ? (prefs.latest?.invoiceStatusOptions ?? [])
      : [];

  // --- Return-level saves (updateCustomerReturn, spliced back, no refetch) ---

  const saveField = async (
    patch: Partial<Omit<UpdateCustomerReturnVariables['input'], 'id'>>
  ) => {
    const node = data();
    if (!node) return;
    const result = await saveReturnFields(params.storeId, {
      id: node.id,
      ...patch,
    });
    if (result.kind === 'saved') {
      const saved = result.node;
      mutate(prev => (prev ? { ...prev, ...saved } : prev));
    }
    return result;
  };

  // ONE debounced buffer for the as-you-type fields (toolbar reference + side
  // panel comment) — a burst across both coalesces into one save.
  const edit = createDebouncedEdit<ReturnEditFields>({
    id: () => data()?.id ?? '',
    initial: () => ({
      theirReference: data()?.theirReference ?? '',
      comment: data()?.comment ?? '',
    }),
    save: patch => void saveField(patch),
  });

  const setHold = (hold: boolean) => void saveField({ onHold: hold });
  const setColour = (colour: string) => void saveField({ colour });

  // Custom-fields save (explicit-save tab) — patch-merged server-side; true on
  // success so the tab clears its dirty state. The prominent-field toolbar uses
  // saveField directly (fire-and-forget, like the other toolbar fields).
  const saveCustomFields = async (
    patch: Record<string, unknown>
  ): Promise<boolean> => {
    const result = await saveField({ customFields: patch });
    return result?.kind === 'saved';
  };

  // A customer change re-runs the customer checks; its typed rejections show
  // inline on the lookup (OMS-REG-DIST-07.17 / .24).
  const changeCustomer = async (customerId: string) => {
    setCustomerError(undefined);
    const result = await saveField({ otherPartyId: customerId });
    if (result?.kind === 'error') setCustomerError(result.message);
  };

  // A line save returns the whole invoice with its refreshed line set —
  // replace the node wholesale (no splicing needed).
  const onLinesSaved = (node: ReturnLinesSaved) => mutate(() => node);

  const onAdvanced = (saved: CustomerReturnInfoFragment) =>
    mutate(prev => (prev ? { ...prev, ...saved } : prev));

  // --- The return-items modal's item plumbing ---

  const itemById = (id: string): ReturnItem | undefined => {
    const line = rows().find(l => l.item.id === id);
    return line ? { id, code: line.item.code, name: line.itemName } : undefined;
  };

  // The distinct item AFTER currentId in the current row order ("OK & next").
  const nextItem = (currentId: string): ReturnItem | undefined => {
    const seen = new Set<string>();
    let past = false;
    for (const line of rows()) {
      const id = line.item.id;
      if (id === currentId) {
        past = true;
        seen.add(id);
        continue;
      }
      if (past && !seen.has(id))
        return { id, code: line.item.code, name: line.itemName };
      seen.add(id);
    }
    return undefined;
  };

  const existingItemIds = (): string[] => [
    ...new Set(rows().map(line => line.item.id)),
  ];
  const existingLineIds = (): ReadonlySet<string> =>
    new Set(rows().map(line => line.id));

  const openRow = (line: Line) =>
    setEditState({ mode: 'update', itemId: line.item.id });
  const openAdd = () => setEditState({ mode: 'add' });

  // The page-level tab set (ui-surface S3 § tabs) — the strip renders in the
  // Header, the panels in the body.
  const tabs = (): TabDef[] => [
    { value: 'details', label: t('label.details') },
    { value: 'custom-fields', label: t('label.custom-fields') },
    { value: 'log', label: t('label.log') },
  ];

  const crumbs = (node: CustomerReturnInfoFragment) => [
    { label: t('distribution') },
    {
      label: t('customer-returns'),
      onClick: () =>
        navigate(`/${params.storeId}/distribution/customer-return`),
    },
    { label: String(node.invoiceNumber) },
  ];

  // Line columns (ui-surface S3 § line table). Each takes its cell-type width
  // preset via getCellDefinition (docs/CELL_TYPES.md) — a bare helper carries
  // no `size`, so the column would mis-width and resize badly; `code`/`batch`
  // also gain the monospace treatment the spec's column table names. Code /
  // Batch / Expiry / Unit stay in the card's default group; the rest fold into
  // the collapsed "More details" disclosure (CARD_GROUPS above).
  const columns = (): Column<Line, never, GroupKey>[] => [
    {
      c: { accessor: line => line.item.code, id: 'item.code' },
      header: () => t('label.code'),
      ...getCellDefinition('code'),
    },
    {
      c: { key: 'itemName' },
      header: () => t('label.name'),
      ...getCellDefinition('itemName', {
        headerPosition: 'primary',
        wrapLines: 2,
      }),
    },
    {
      c: { key: 'batch' },
      header: () => t('label.batch'),
      ...getCellDefinition('batch'),
    },
    {
      c: { key: 'expiryDate' },
      header: () => t('label.expiry'),
      // The expiry preset, not the plain date cell: it carries the near-expiry
      // emphasis the spec's column 4 names.
      ...getCellDefinition('expiryDate'),
    },
    {
      c: { accessor: line => line.item.unitName ?? '', id: 'unitName' },
      header: () => t('label.unit'),
      ...getCellDefinition('unitName'),
    },
    {
      c: { key: 'packSize' },
      header: () => t('label.pack-size'),
      ...getCellDefinition('packSize'),
      cardGroup: 'more',
    },
    {
      c: { key: 'numberOfPacks' },
      header: () => t('label.num-packs'),
      ...getCellDefinition('numberOfPacks', { headerPosition: 'badge' }),
    },
    {
      // No CELL_DEF key — the explicit helper plus a call-site width, since
      // "Total quantity" is the binding constraint, not the value.
      c: {
        accessor: line => line.packSize * line.numberOfPacks,
        id: 'totalQuantity',
      },
      header: () => t('label.total-quantity'),
      ...getNumberCell(),
      size: remToPx(7),
      cardGroup: 'more',
    },
    {
      c: { key: 'sellPricePerPack' },
      header: () => t('label.pack-sell-price'),
      ...getCellDefinition('sellPricePerPack'),
      cardGroup: 'more',
    },
    {
      c: {
        accessor: line => line.sellPricePerPack * line.numberOfPacks,
        id: 'lineTotal',
      },
      header: () => t('label.line-total'),
      ...getCellDefinition('lineTotal'),
      cardGroup: 'more',
    },
    {
      c: { key: 'volumePerPack' },
      header: () => t('label.volume-per-pack'),
      ...getCellDefinition('volumePerPack'),
      cardGroup: 'more',
    },
  ];

  return (
    <Suspense fallback={<Spinner center />}>
      {/* NON-keyed Show (kdd/solid-reactivity-pitfalls): every save sets a
          fresh node object; keyed would remount the page and drop focus. */}
      <Show when={info()}>
        {node => {
          const disabled = createMemo(() => isReturnDisabled(node()));
          return (
            // The <Tabs> root wraps the whole Page from outside (display:
            // contents, so it adds no layout box): the TabList lives in the
            // Header — claiming its bottom edge — and the TabPanels in the
            // body, both sharing this one tabs context (ui-standards →
            // page-level tabs).
            <Tabs defaultValue="details">
              <Page
                fillBody
                sidePanelOpen={sidePanelOpen()}
                sidePanelTitle={t('heading.details')}
                onSidePanelClose={() => setSidePanelOpen(false)}
                sidePanelContent={
                  <CustomerReturnSidePanel
                    node={node()}
                    disabled={disabled()}
                    edit={edit}
                    onSetColour={setColour}
                  />
                }
                header={
                  <Header>
                    <Breadcrumb crumbs={crumbs(node())} />
                    <HeaderButtons>
                      <Show when={!disabled()}>
                        <Button
                          icon={<PlusCircleIcon />}
                          data-testid="add-item-button"
                          onClick={openAdd}
                        >
                          {t('button.add-item')}
                        </Button>
                      </Show>
                      {/* Export/Print — the reports vertical's record-screen
                          selector (reports S4), available at every status;
                          same self-contained action + tone as the stocktake
                          detail. */}
                      <ExportPrintAction returnId={node().id} />
                      {/* More — the closed-panel reopen affordance, at the end
                          of the app-bar page-action cluster (spec ui-standards/
                          layout.md → page regions). Shows ONLY while the panel
                          is closed; uses the sidebar glyph (not the info icon),
                          and reopening counts as the user's explicit open
                          choice. */}
                      <Show when={!sidePanelOpen()}>
                        <Button
                          variant="secondary"
                          icon={<SidebarIcon />}
                          data-testid="open-detail-panel-button"
                          onClick={() => setSidePanelOpen(true)}
                        >
                          {t('button.more')}
                        </Button>
                      </Show>
                    </HeaderButtons>
                    {/* The header field cluster (ui-standards → HeaderToolbar):
                        each field labelled above its control, equal shares
                        wrapping as a unit. The kind banner (rules § manual vs
                        transfer) is the cluster's trailing compact Alert — it
                        rides the row's end and drops to its own line when the
                        row can't hold it: manual returns don't track delivery
                        automatically; a transfer return explains why editing
                        waits until it is received (OMS-REG-DIST-07.43). */}
                    <HeaderToolbar
                      alert={
                        <Alert severity="info" compact>
                          <Show
                            when={returnKind(node()) === 'transfer'}
                            fallback={t('info.manual-return')}
                          >
                            {t('info.automatic-return')}
                            <Show
                              when={disabled() && node().status !== 'VERIFIED'}
                            >
                              {' '}
                              {t('info.automatic-return-no-edit')}
                            </Show>
                          </Show>
                        </Alert>
                      }
                    >
                      <CustomerReturnToolbar
                        storeId={params.storeId}
                        node={node()}
                        disabled={disabled()}
                        edit={edit}
                        onChangeCustomer={id => void changeCustomer(id)}
                        customerError={customerError()}
                      />
                      {/* PROMINENT custom fields — stay in the cluster even
                          when the return is read-only, just disabled. They wear
                          their own labels like the fields beside them (the
                          cluster's `field` layout). */}
                      <CustomFieldsToolbar
                        scope="customer_return"
                        recordId={node().id}
                        values={node().customFields}
                        disabled={disabled()}
                        layout="field"
                        onSave={patch =>
                          void saveField({ customFields: patch })
                        }
                      />
                    </HeaderToolbar>
                    {/* Last child of the Header → the tab strip claims its
                        bottom edge (Header.module.css / Tabs). Details | Custom
                        fields | Log (ui-surface S3 § tabs). */}
                    <TabList tabs={tabs()} />
                  </Header>
                }
                contentFooter={
                  <CustomerReturnStatusFooter
                    storeId={params.storeId}
                    node={node()}
                    disabled={disabled()}
                    hasLines={hasLines()}
                    statusOptions={statusOptions()}
                    onSetHold={setHold}
                    onAdvanced={onAdvanced}
                  />
                }
              >
                <TabPanel value="details">
                  <DataTable
                    columns={columns()}
                    cardGroups={CARD_GROUPS}
                    rows={rows()}
                    rowKey={line => line.id}
                    loading={data.loading}
                    onRowClick={disabled() ? undefined : openRow}
                    emptyMessage={t('error.no-customer-return-items')}
                    empty={
                      disabled() ? undefined : (
                        <Button
                          variant="ghost"
                          data-testid="nothing-here-create-button"
                          onClick={openAdd}
                        >
                          {t('button.add-item')}
                        </Button>
                      )
                    }
                    config={tableConfig.config()}
                    setConfig={tableConfig.setConfig}
                    configIsDefault={tableConfig.isConfigDefault()}
                    // Central-server admins (EDIT_CENTRAL_DATA) can promote
                    // their layout to the install-wide default.
                    onSaveGlobalDefault={
                      tableConfig.canSaveGlobalDefault()
                        ? tableConfig.saveGlobalTableConfig
                        : undefined
                    }
                  />
                </TabPanel>
                <TabPanel value="custom-fields">
                  {/* Custom fields for the customer_return scope — disabled once
                      the return is read-only. Prominent fields live in the
                      header cluster, so the tab shows the rest. */}
                  <CustomFieldsEditTab
                    scope="customer_return"
                    promoteToToolbar
                    disabled={disabled()}
                    values={node().customFields}
                    onSave={saveCustomFields}
                  />
                </TabPanel>
                <TabPanel value="log">
                  <LogTab storeId={params.storeId} recordId={node().id} />
                </TabPanel>
                <ReturnItemsModal
                  open={editState() != null}
                  onClose={() => setEditState(undefined)}
                  storeId={params.storeId}
                  returnId={node().id}
                  mode={editState()?.mode ?? 'update'}
                  initialItemId={
                    editState()?.mode === 'update'
                      ? (editState() as { itemId: string }).itemId
                      : undefined
                  }
                  excludeItemIds={existingItemIds}
                  nextItem={nextItem}
                  itemById={itemById}
                  onSaved={onLinesSaved}
                  existingLineIds={existingLineIds}
                  returnFromName={node().otherPartyName}
                  edit={edit}
                />
              </Page>
            </Tabs>
          );
        }}
      </Show>
    </Suspense>
  );
};

export default CustomerReturnDetailView;
