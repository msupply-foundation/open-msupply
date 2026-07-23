import { createResource } from 'solid-js';
import type { Component } from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import { graphqlFetch } from '../../../api/graphql';
import { t } from '../../../intl';
import type { LocaleKey } from '../../../intl';
import { createTableConfig } from '../../../api/createTableConfig';
import { DataTable, type Column } from '../../../ui/elements/table/DataTable';
import {
  getDateCell,
  getNumberCell,
} from '../../../ui/elements/table/tableHelpers';
import { SupplierPurchaseOrders } from '../names.generated';
import type { SupplierPurchaseOrdersResult } from '../names.generated';
import { purchaseOrderAreaPath } from '../list/namesListLogic';

// S4 Purchase orders tab — a read-only reference list of the supplier's purchase
// orders (AC-N26). The DATA is owned by the purchase-order vertical (contract ›
// record detail: cross-vertical, named not owned); this tab only lists them, and
// selecting a row opens the purchase-order area. The PO vertical isn't built in
// this scope, so a row navigates to the PO area landing (deep-link to a specific
// PO awaits that vertical — see BUILD_REPORT). It is the standard data table
// (with its view-control toolbar), matching the list views (spec/ui-standards/
// detail-views › tabs).

type PoRow = SupplierPurchaseOrdersResult['purchaseOrders']['nodes'][number];

// Purchase-order status → its translated label (mirrors the current app's
// getStatusTranslator). Keyed by the enum so a new status is a compile error.
const PO_STATUS_KEY: Record<PoRow['status'], LocaleKey> = {
  NEW: 'label.new',
  REQUEST_APPROVAL: 'label.ready-for-approval',
  CONFIRMED: 'label.ready-to-send',
  SENT: 'label.sent',
  FINALISED: 'label.finalised',
};

export const PurchaseOrdersTab: Component<{ supplierName: string }> = props => {
  const params = useParams<{ storeId: string }>();
  const navigate = useNavigate();
  const tableConfig = createTableConfig({
    tableId: 'names-supplier-purchase-orders',
  });

  const [data] = createResource(
    () => props.supplierName,
    async supplierName => {
      const result = await graphqlFetch(SupplierPurchaseOrders, {
        storeId: params.storeId,
        supplierName,
      });
      if (result.kind !== 'success') return [];
      return result.data.purchaseOrders.nodes;
    }
  );

  // Non-suspending read (opened on interaction — see the reactivity note in
  // CustomFieldsTab / kdd/solid-reactivity-pitfalls).
  const rows = (): PoRow[] =>
    data.state === 'ready' || data.state === 'refreshing'
      ? (data.latest ?? [])
      : [];

  const columns = (): Column<PoRow, never>[] => [
    { c: { key: 'number' }, header: t('label.number'), ...getNumberCell() },
    {
      c: { key: 'createdDatetime' },
      header: t('label.created'),
      ...getDateCell(),
    },
    {
      c: { key: 'confirmedDatetime' },
      header: t('label.confirmed'),
      ...getDateCell(),
    },
    {
      c: { accessor: row => t(PO_STATUS_KEY[row.status]), id: 'status' },
      header: t('label.status'),
    },
    {
      c: { key: 'targetMonths' },
      header: t('label.target-months'),
      ...getNumberCell(),
    },
    {
      c: { accessor: row => row.lines.totalCount, id: 'lines' },
      header: t('label.lines'),
      ...getNumberCell(),
    },
    { c: { key: 'comment' }, header: t('label.comment') },
  ];

  return (
    <DataTable
      columns={columns()}
      rows={rows()}
      rowKey={r => r.id}
      loading={data.loading}
      emptyMessage={t('name.po.empty')}
      config={tableConfig.config()}
      setConfig={tableConfig.setConfig}
      // Selecting a purchase order opens it in the purchase-order area (AC-N26).
      onRowClick={() => navigate(purchaseOrderAreaPath(params.storeId))}
    />
  );
};
