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
import { Toolbar } from '../../../ui/layout/Header/Toolbar';
import { Button } from '../../../ui/elements/buttons/Button';
import { Spinner } from '../../../ui/elements/feedback/Spinner';
import { Tabs, TabList, TabPanel } from '../../../ui/elements/tabs/Tabs';
import { InfoIcon, PlusCircleIcon } from '../../../ui/icons';
import { DataTable, type Column } from '../../../ui/elements/table/DataTable';
import {
  getCurrencyCell,
  getDateCell,
  getNumberCell,
} from '../../../ui/elements/table/tableHelpers';
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
import { isReturnDisabled } from './returnStatus';
import { saveReturnFields } from './returnUpdate';
import type { ReturnEditFields } from './returnEdit';
import { ExportPrintAction } from './actions/ExportPrintAction';

// The customer-return detail view (spec/customer-returns/ui-surface.md S3):
// toolbar (customer / reference / kind banner), Details | Log tabs, the
// read-only line table grouped by item (row click → the return-items modal),
// the Additional-info side panel, and the status footer (hold / lifecycle /
// close / advance). Every edit affordance shares the one editability gate
// (rules § editability; AC-E7): a VERIFIED return — or a transfer return still
// in the sender's hands — is read-only.

type Line = CustomerReturnLineFragment;

const CustomerReturnDetailView: Component = () => {
  const params = useParams<{ storeId: string; returnId: string }>();
  const navigate = useNavigate();
  const [sidePanelOpen, setSidePanelOpen] = createSignal(false);
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
  const statusOptions = () => prefs.latest?.invoiceStatusOptions ?? [];

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
  // inline on the lookup (AC-C2 / AC-E6).
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

  const crumbs = (node: CustomerReturnInfoFragment) => [
    { label: t('distribution') },
    {
      label: t('customer-returns'),
      onClick: () =>
        navigate(`/${params.storeId}/distribution/customer-return`),
    },
    { label: String(node.invoiceNumber) },
  ];

  // Line columns (ui-surface S3 § line table), grouped by item.
  const columns = (): Column<Line, never>[] => [
    {
      c: { accessor: line => line.item.code, id: 'item.code' },
      header: () => t('label.code'),
    },
    {
      c: { key: 'itemName' },
      header: () => t('label.name'),
      meta: { headerPosition: 'primary', wrapLines: 2 },
    },
    {
      c: { key: 'batch' },
      header: () => t('label.batch'),
    },
    {
      c: { key: 'expiryDate' },
      header: () => t('label.expiry'),
      ...getDateCell(),
    },
    {
      c: { accessor: line => line.item.unitName ?? '', id: 'unitName' },
      header: () => t('label.unit'),
    },
    {
      c: { key: 'packSize' },
      header: () => t('label.pack-size'),
      ...getNumberCell(),
    },
    {
      c: { key: 'numberOfPacks' },
      header: () => t('label.num-packs'),
      ...getNumberCell(),
      meta: { headerPosition: 'badge' },
    },
    {
      c: {
        accessor: line => line.packSize * line.numberOfPacks,
        id: 'totalQuantity',
      },
      header: () => t('label.total-quantity'),
      ...getNumberCell(),
    },
    {
      c: { key: 'sellPricePerPack' },
      header: () => t('label.pack-sell-price'),
      ...getCurrencyCell(),
    },
    {
      c: {
        accessor: line => line.sellPricePerPack * line.numberOfPacks,
        id: 'lineTotal',
      },
      header: () => t('label.line-total'),
      ...getCurrencyCell(),
    },
    {
      c: { key: 'volumePerPack' },
      header: () => t('label.volume-per-pack'),
      ...getNumberCell(),
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
                    <Show when={!sidePanelOpen()}>
                      <Button
                        variant="secondary"
                        icon={<InfoIcon />}
                        onClick={() => setSidePanelOpen(true)}
                      >
                        {t('button.more')}
                      </Button>
                    </Show>
                  </HeaderButtons>
                  <Toolbar>
                    <CustomerReturnToolbar
                      storeId={params.storeId}
                      node={node()}
                      disabled={disabled()}
                      edit={edit}
                      onChangeCustomer={id => void changeCustomer(id)}
                      customerError={customerError()}
                    />
                    {/* PROMINENT custom fields — stay in the toolbar even when
                        the return is read-only, just disabled. */}
                    <CustomFieldsToolbar
                      scope="customer_return"
                      recordId={node().id}
                      values={node().customFields}
                      disabled={disabled()}
                      onSave={patch => void saveField({ customFields: patch })}
                    />
                  </Toolbar>
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
              {/* Details | Log (ui-surface S3 § tabs). */}
              <Tabs defaultValue="details">
                <TabList
                  tabs={[
                    { value: 'details', label: t('label.details') },
                    {
                      value: 'custom-fields',
                      label: t('label.custom-fields'),
                    },
                    { value: 'log', label: t('label.log') },
                  ]}
                />
                <TabPanel value="details">
                  <DataTable
                    columns={columns()}
                    rows={rows()}
                    rowKey={line => line.id}
                    loading={data.loading}
                    onRowClick={disabled() ? undefined : openRow}
                    emptyMessage={t('error.no-customer-return-items')}
                    empty={
                      disabled() ? undefined : (
                        <Button
                          icon={<PlusCircleIcon />}
                          data-testid="nothing-here-create-button"
                          onClick={openAdd}
                        >
                          {t('button.add-item')}
                        </Button>
                      )
                    }
                    config={tableConfig.config()}
                    setConfig={tableConfig.setConfig}
                  />
                </TabPanel>
                <TabPanel value="custom-fields">
                  {/* Custom fields for the customer_return scope — disabled once
                      the return is read-only. Prominent fields live in the
                      toolbar, so the tab shows the rest. */}
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
              </Tabs>
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
          );
        }}
      </Show>
    </Suspense>
  );
};

export default CustomerReturnDetailView;
