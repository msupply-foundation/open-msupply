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
} from '@openmsupply-client/common';
import {
  getStatusTranslator,
  isOutboundDisabled,
  outboundStatuses,
} from '../../utils';
import { AppBarButtons } from './AppBarButtons';
import { useOutbound } from '../api';
import { OutboundRowFragment } from '../api/operations.generated';
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
      { key: 'status', condition: 'equalTo' },
      { key: 'theirReference' },
      { key: 'createdDatetime', condition: 'between' },
      { key: 'shippedDatetime', condition: 'between' },
      { key: 'invoiceNumber', condition: 'equalTo', isNumber: true },
    ],
  });
  const queryParams = { ...filter, sortBy, first, offset };

  const { data, isFetching, isError } = useOutbound.document.list(queryParams);
  const { mutate: onUpdate } = useOutbound.document.update();
  const statuses = outboundStatuses.filter(status =>
    invoiceStatusOptions?.includes(status)
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
      getIsRestrictedRow: isOutboundDisabled,
      noDataElement: (
        <NothingHere
          body={t('error.no-outbound-shipments')}
          onCreate={modalController.toggleOn}
        />
      ),
    });

  return (
    <>
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
