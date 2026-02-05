import React, { useMemo } from 'react';
import {
  NothingHere,
  useNavigate,
  useParams,
  useTranslation,
  RouteBuilder,
  ColumnDef,
  ColumnType,
  useNonPaginatedMaterialTable,
  MaterialTable,
  InvoiceNodeStatus,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { getInvoiceStatusTranslator, useInbound } from '@openmsupply-client/invoices/src';
import { InboundRowFragment } from '@openmsupply-client/invoices/src/InboundShipment/api';

export const InboundShipments = () => {
  const t = useTranslation();
  const { purchaseOrderId } = useParams();
  const navigate = useNavigate();

  const queryParams = {
    first: 100,
    offset: 0,
    filterBy: { purchaseOrderId: { equalTo: purchaseOrderId || '' }, type: { equalTo: 'INBOUND' } },
    sortBy: { key: 'number', direction: 'desc' as 'asc' | 'desc' },
  }
  const { data, isFetching } = useInbound.document.list(queryParams);

  const columns = useMemo(
    (): ColumnDef<InboundRowFragment>[] => [
      {
        header: t('label.number'),
        accessorKey: 'invoiceNumber',
        columnType: ColumnType.Number,
        size: 60,
        enableSorting: true,
        enableColumnFilter: true,
      },
      {
        header: t('label.supplier'),
        accessorKey: 'otherPartyName',
      },
      {
        header: t('label.status'),
        id: 'status',
        size: 120,
        accessorFn: row => getInvoiceStatusTranslator(t)(row.status),
        filterVariant: 'select',
        filterSelectOptions: Object.values(InvoiceNodeStatus).map(
          status => ({
            value: status,
            label: getInvoiceStatusTranslator(t)(status),
          })
        ),
        enableSorting: true,
        enableColumnFilter: true,
      },
      {
        header: t('label.supplier-reference'),
        accessorKey: 'theirReference',
      },
      {
        header: t('label.created'),
        accessorKey: 'createdDatetime',
        columnType: ColumnType.Date,
        enableSorting: true,
        size: 100,
      },
      {
        header: t('label.received'),
        accessorKey: 'receivedDatetime',
        columnType: ColumnType.Date,
        enableSorting: true,
        size: 100,
      },
    ],
    []
  );

  const handleRowClick = (row: InboundRowFragment) => {
    const path = RouteBuilder.create(AppRoute.Replenishment)
      .addPart(AppRoute.InboundShipment)
      .addPart(row.id)
      .build();
    navigate(path);
  };

  const { table } = useNonPaginatedMaterialTable<InboundRowFragment>({
    tableId: 'inbound-shipments-list-in-purchase-order',
    isLoading: isFetching,
    onRowClick: handleRowClick,
    columns,
    data: data?.nodes,
    initialSort: { key: 'createdDatetime', dir: 'desc' },
    enableRowSelection: false,
    noDataElement: <NothingHere body={t('error.no-inbound-shipments-linked')} />,
  });

  return <MaterialTable table={table} />;
};
