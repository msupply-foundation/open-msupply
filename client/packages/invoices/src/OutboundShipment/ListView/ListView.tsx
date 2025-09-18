import React, { useMemo } from 'react';
import {
  useNavigate,
  useTranslation,
  InvoiceNodeStatus,
  useToggle,
  useUrlQueryParams,
  TextWithTooltipCell,
  useSimplifiedTabletUI,
  MaterialTable,
  usePaginatedMaterialTable,
  ColumnDef,
  ColumnType,
  NameAndColorSetterCell,
} from '@openmsupply-client/common';
import { getStatusTranslator, isOutboundDisabled } from '../../utils';
import { Toolbar } from './Toolbar';
import { AppBarButtons } from './AppBarButtons';
import { useOutbound } from '../api';
import { OutboundRowFragment } from '../api/operations.generated';
import { Footer } from './Footer';

export const OutboundShipmentListView = () => {
  const t = useTranslation();
  const navigate = useNavigate();
  const modalController = useToggle();
  const simplifiedTabletView = useSimplifiedTabletUI();

  const {
    filter,
    queryParams: { sortBy, first, offset },
  } = useUrlQueryParams({
    initialSort: { key: 'invoiceNumber', dir: 'desc' },
    filters: [
      { key: 'otherPartyName' },
      { key: 'status', condition: 'equalTo' },
      { key: 'theirReference' },
      { key: 'createdDatetime', condition: 'between' },
      { key: 'shippedDatetime', condition: 'between' },
      { key: 'invoiceNumber', condition: 'equalTo', isNumber: true },
    ],
  });
  const queryParams = { ...filter, sortBy, first, offset };

  const { data, isLoading } = useOutbound.document.list(queryParams);
  const { mutate: onUpdate } = useOutbound.document.update();

  const mrtColumns = useMemo(
    (): ColumnDef<OutboundRowFragment>[] => [
      {
        header: t('label.name'),
        accessorKey: 'otherPartyName',
        size: 400,
        enableColumnFilter: true,
        enableSorting: true,
        defaultHideOnMobile: true,
        Cell: ({ row }) => (
          <NameAndColorSetterCell
            onColorChange={onUpdate}
            getIsDisabled={isOutboundDisabled}
            row={row.original}
          />
        ),
      },
      {
        id: 'status',
        header: t('label.status'),
        accessorFn: row => getStatusTranslator(t)(row.status),
        size: 140,
        enableSorting: true,
        enableColumnFilter: true,
        filterVariant: 'select',
        filterSelectOptions: [
          { value: InvoiceNodeStatus.New, label: t('label.new') },
          { value: InvoiceNodeStatus.Allocated, label: t('label.allocated') },
          { value: InvoiceNodeStatus.Picked, label: t('label.picked') },
          { value: InvoiceNodeStatus.Shipped, label: t('label.shipped') },
          { value: InvoiceNodeStatus.Delivered, label: t('label.delivered') },
          { value: InvoiceNodeStatus.Received, label: t('label.received') },
          { value: InvoiceNodeStatus.Verified, label: t('label.verified') },
        ],
      },
      {
        accessorKey: 'invoiceNumber',
        header: t('label.invoice-number'),
        columnType: ColumnType.Number,
        description: t('description.invoice-number'),
        enableSorting: true,
      },
      {
        accessorKey: 'createdDatetime',
        header: t('label.created'),
        columnType: ColumnType.Date,
        enableSorting: true,
        enableColumnFilter: true,
      },
      {
        accessorKey: 'theirReference',
        header: t('label.reference'),
        description: t('description.customer-reference'),
        size: 175,
        defaultHideOnMobile: true,
        Cell: TextWithTooltipCell,
      },

      {
        accessorKey: 'pricing.totalAfterTax',
        header: t('label.total'),
        columnType: ColumnType.Currency,
        defaultHideOnMobile: true,
      },
      {
        accessorKey: 'comment',
        header: t('label.comment'),
        columnType: ColumnType.Comment,
      },
    ],
    []
  );

  const { table, selectedRows, resetRowSelection } =
    usePaginatedMaterialTable<OutboundRowFragment>({
      tableId: 'outbound-shipment-list',
      isLoading,
      onRowClick: row => navigate(row.id),
      columns: mrtColumns,
      data: data?.nodes ?? [],
      totalCount: data?.totalCount ?? 0,
      initialSort: { key: 'invoiceNumber', dir: 'desc' },
      getIsRestrictedRow: isOutboundDisabled,
    });
  //     noDataElement={
  //   <NothingHere
  //     body={t('error.no-outbound-shipments')}
  //     onCreate={modalController.toggleOn}
  //   />
  // }

  return (
    <>
      <Toolbar filter={filter} simplifiedTabletView={simplifiedTabletView} />
      <AppBarButtons
        modalController={modalController}
        simplifiedTabletView={simplifiedTabletView}
      />
      <MaterialTable table={table} />

      <Footer
        selectedRows={selectedRows}
        resetRowSelection={resetRowSelection}
      />
    </>
  );
};
