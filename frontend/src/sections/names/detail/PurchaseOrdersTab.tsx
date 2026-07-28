import { createResource } from 'solid-js';
import type { Component } from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import { graphqlFetch } from '../../../api/graphql';
import { t } from '../../../intl';
import { createTableConfig } from '../../../api/createTableConfig';
import { DataTable, type Column } from '../../../ui/elements/table/DataTable';
import {
  getDateCell,
  getNumberCell,
} from '../../../ui/elements/table/tableHelpers';
import { SupplierPurchaseOrders } from '../names.generated';
import type { SupplierPurchaseOrdersResult } from '../names.generated';
import { purchaseOrderAreaPath } from '../list/namesListLogic';
import { poStatusLabel } from './purchaseOrderStatus';

// S4 Purchase orders tab — a read-only reference list of the supplier's purchase
// orders (AC-N26). The DATA is owned by the purchase-order vertical (contract ›
// record detail: cross-vertical, named not owned); this tab only lists them, and
// selecting a row opens the purchase-order area. The PO vertical isn't built in
// this scope, so a row navigates to the PO area landing (deep-link to a specific
// PO awaits that vertical — see BUILD_REPORT). It is the standard data table
// (with its view-control toolbar), matching the list views (spec/ui-standards/
// detail-views › tabs).

type PoRow = SupplierPurchaseOrdersResult['purchaseOrders']['nodes'][number];

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
  // domain/customFields CustomFieldsView / kdd/solid-reactivity-pitfalls).
  const rows = (): PoRow[] =>
    data.state === 'ready' || data.state === 'refreshing'
      ? (data.latest ?? [])
      : [];

  const columns = (): Column<PoRow, never>[] => [
    {
      c: { key: 'number' },
      header: () => t('label.number'),
      ...getNumberCell(),
    },
    {
      c: { key: 'createdDatetime' },
      header: () => t('label.created'),
      ...getDateCell(),
    },
    {
      c: { key: 'confirmedDatetime' },
      header: () => t('label.confirmed'),
      ...getDateCell(),
    },
    {
      c: { accessor: row => poStatusLabel(row.status), id: 'status' },
      header: () => t('label.status'),
    },
    {
      c: { key: 'targetMonths' },
      header: () => t('label.target-months'),
      ...getNumberCell(),
    },
    {
      c: { accessor: row => row.lines.totalCount, id: 'lines' },
      header: () => t('label.lines'),
      ...getNumberCell(),
    },
    { c: { key: 'comment' }, header: () => t('label.comment') },
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
