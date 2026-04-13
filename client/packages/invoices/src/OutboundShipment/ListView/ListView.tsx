import React, { useMemo } from 'react';
import {
  useNavigate,
  useTranslation,
  useToggle,
  useUrlQueryParams,
  TextWithTooltipCell,
  useSimplifiedTabletUI,
  MaterialTable,
  usePaginatedMaterialTable,
  ColumnDef,
  ColumnType,
  NameAndColorSetterCell,
  NothingHere,
  usePreferences,
  InvoiceNodeType,
} from '@openmsupply-client/common';
import { getStatusTranslator, isOutboundDisabled } from '../../utils';
import { getStatusSequence } from '../../statuses';
import { AppBarButtons } from './AppBarButtons';
import { useOutbound } from '../api';
import { OutboundRowFragment } from '../api/operations.generated';
import { Toolbar } from './Toolbar';
import { Footer } from './Footer';

export const OutboundShipmentListView = () => {
  const t = useTranslation();
  const navigate = useNavigate();
  const { invoiceStatusOptions } = usePreferences();
  const modalController = useToggle();
  const simplifiedTabletView = useSimplifiedTabletUI();

  const {
    filter,
    queryParams: { sortBy, first, offset },
  } = useUrlQueryParams({
    initialSort: { key: 'invoiceNumber', dir: 'desc' },
    filters: [
      { key: 'otherPartyName' },
      { key: 'status', condition: 'equalAny' },
      { key: 'theirReference' },
      { key: 'createdDatetime', condition: 'between' },
      { key: 'shippedDatetime', condition: 'between' },
      { key: 'invoiceNumber', condition: 'equalTo', isNumber: true },
    ],
  });
  const queryParams = { ...filter, sortBy, first, offset };

  const { data, isFetching, isError } = useOutbound.document.list(queryParams);
  const { mutate: onUpdate } = useOutbound.document.update();
  const statuses = getStatusSequence(InvoiceNodeType.OutboundShipment).filter(
    status => invoiceStatusOptions?.includes(status)
  );

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
        filterSelectOptions: statuses.map(status => ({
          value: status,
          label: getStatusTranslator(t)(status),
        })),
      },
      {
        accessorKey: 'invoiceNumber',
        header: t('label.number'),
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
        accessorKey: 'comment',
        header: t('label.comment'),
        columnType: ColumnType.Comment,
      },
      {
        accessorKey: 'pricing.totalAfterTax',
        header: t('label.total'),
        columnType: ColumnType.Currency,
        defaultHideOnMobile: true,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const { table, selectedRows } =
    usePaginatedMaterialTable<OutboundRowFragment>({
      tableId: 'outbound-shipment-list',
      isLoading: isFetching,
      isError,
      onRowClick: row => navigate(row.id),
      columns: mrtColumns,
      data: data?.nodes,
      totalCount: data?.totalCount ?? 0,
      initialSort: { key: 'invoiceNumber', dir: 'desc' },
      getIsRestrictedRow: row => isOutboundDisabled(row.original),
      noDataElement: (
        <NothingHere
          body={t('error.no-outbound-shipments')}
          onCreate={modalController.toggleOn}
        />
      ),
    });

  return (
    <>
      <Toolbar filter={filter} />
      <AppBarButtons
        modalController={modalController}
        simplifiedTabletView={simplifiedTabletView}
      />
      <MaterialTable table={table} />

      <Footer
        selectedRows={selectedRows}
        resetRowSelection={table.resetRowSelection}
      />
    </>
  );
};
