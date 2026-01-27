import React, { useMemo } from 'react';
import {
  useNavigate,
  useTranslation,
  NothingHere,
  useToggle,
  useUrlQueryParams,
  ColumnType,
  ColumnDef,
  usePaginatedMaterialTable,
  MaterialTable,
  NameAndColorSetterCell,
  usePreferences,
  DetailTabs,
} from '@openmsupply-client/common';
import { AppBarButtons } from './AppBarButtons';
import {
  getStatusTranslator,
  inboundStatuses,
  isInboundDisabled,
  isInboundListItemDisabled,
} from '../../utils';
import { useInbound, InboundRowFragment } from '../api';
import { Footer } from './Footer';

export const InboundListView = () => {
  const t = useTranslation();
  const invoiceModalController = useToggle();
  const linkRequestModalController = useToggle();

  const tabs = [
    {
      Component: <InboundShipments />,
      value: t('label.internal'),
    },
    {
      Component: <InboundShipments external />,
      value: t('label.external'),
    },
  ];

  return (
    <>
      <AppBarButtons
        invoiceModalController={invoiceModalController}
        linkRequestModalController={linkRequestModalController}
      />
      <DetailTabs tabs={tabs} overwriteQuery={false} restoreTabQuery={false} />
    </>
  );
};

const InboundShipments: React.FC<{ external?: boolean }> = ({ external = false }) => {
  const t = useTranslation();
  const navigate = useNavigate();
  const { invoiceStatusOptions } = usePreferences();
  const invoiceModalController = useToggle();
  const linkRequestModalController = useToggle();
  const { mutate: onUpdate } = useInbound.document.update();

  const {
    queryParams: { first, offset, sortBy, filterBy },
  } = useUrlQueryParams({
    // initialSort: { key: 'invoiceNumber', dir: 'desc' },
    filters: [
      { key: 'invoiceNumber', condition: 'equalTo', isNumber: true },
      { key: 'otherPartyName' },
      {
        key: 'createdDatetime',
        condition: 'between',
      },
      { key: 'status', condition: 'equalTo' },
    ],
  });

  const listParams = {
    sortBy,
    first,
    offset,
    filterBy: {
      ...filterBy,
      purchaseOrderId: external
        ? { notEqualTo: '' } // Removes results where purchaseOrderId is null
        : { equalAnyOrNull: '' } // Only gives results where purchaseOrderId is null
    },
  };

  const { data, isFetching } = useInbound.document.list(listParams);
  const statuses = inboundStatuses.filter(status =>
    invoiceStatusOptions?.includes(status)
  );

  const columns = useMemo(
    (): ColumnDef<InboundRowFragment>[] => [
      {
        header: t('label.supplier'),
        accessorKey: 'otherPartyName',
        enableColumnFilter: true,
        Cell: ({ row }) => (
          <NameAndColorSetterCell
            onColorChange={onUpdate}
            getIsDisabled={isInboundDisabled}
            row={row.original}
          />
        ),
        enableSorting: true,
      },
      {
        header: t('label.number'),
        accessorKey: 'invoiceNumber',
        columnType: ColumnType.Number,
        size: 90,
        enableColumnFilter: true,
        enableSorting: true,
      },
      {
        header: t('label.purchase-order-number'),
        accessorKey: 'purchaseOrder.number',
        columnType: ColumnType.Number,
        includeColumn: external,
      },
      {
        header: t('label.created'),
        accessorKey: 'createdDatetime',
        columnType: ColumnType.Date,
        enableColumnFilter: true,
        enableSorting: true,
        size: 100,
      },
      {
        header: t('label.delivered'),
        accessorKey: 'deliveredDatetime',
        columnType: ColumnType.Date,
        defaultHideOnMobile: true,
        enableColumnFilter: true,
        enableSorting: true,
        size: 100,
      },
      {
        header: t('label.status'),
        accessorFn: row => getStatusTranslator(t)(row.status),
        id: 'status',
        size: 140,
        filterVariant: 'select',
        filterSelectOptions: statuses.map(status => ({
          value: status,
          label: getStatusTranslator(t)(status),
        })),
        enableColumnFilter: true,
        enableSorting: true,
      },
      {
        header: t('label.reference'),
        accessorKey: 'theirReference',
        size: 225,
        defaultHideOnMobile: true,
        enableSorting: true,
      },
      {
        header: t('label.total'),
        accessorFn: row => row.pricing.totalAfterTax,
        columnType: ColumnType.Currency,
        defaultHideOnMobile: true,
      },
      {
        header: t('label.comment'),
        accessorKey: 'comment',
        columnType: ColumnType.Comment,
      },
    ],
    []
  );

  const { table, selectedRows } = usePaginatedMaterialTable<InboundRowFragment>(
    {
      tableId: 'inbound-shipment-list-view',
      isLoading: isFetching,
      onRowClick: row => navigate(row.id),
      columns,
      data: data?.nodes ?? [],
      totalCount: data?.totalCount ?? 0,
      initialSort: { key: 'invoiceNumber', dir: 'desc' },
      getIsRestrictedRow: isInboundListItemDisabled,
      noDataElement: (
        <NothingHere
          body={t('error.no-inbound-shipments')}
          onCreate={invoiceModalController.toggleOn}
        />
      ),
    }
  );

  return (
    <>
      <AppBarButtons
        invoiceModalController={invoiceModalController}
        linkRequestModalController={linkRequestModalController}
      />
      <MaterialTable table={table} />
      <Footer
        selectedRows={selectedRows}
        resetRowSelection={table.resetRowSelection}
      />
    </>
  );
}
