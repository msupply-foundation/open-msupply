import React, { FC, useEffect, useMemo } from 'react';
import {
  useNavigate,
  DataTable,
  useColumns,
  getNameAndColorColumn,
  TableProvider,
  createTableStore,
  useTranslation,
  InvoiceNodeStatus,
  useTableStore,
  NothingHere,
  useToggle,
  useUrlQueryParams,
  TooltipTextCell,
  GenericColumnKey,
  getCommentPopoverColumn,
  useSimplifiedTabletUI,
  useFeatureFlags,
  MaterialTable,
  usePaginatedMaterialTable,
  ColumnDef,
  getNameAndColorSetterColumn,
  ColumnType,
} from '@openmsupply-client/common';
import { getStatusTranslator, isOutboundDisabled } from '../../utils';
import { Toolbar } from './Toolbar';
import { AppBarButtons } from './AppBarButtons';
import { useOutbound } from '../api';
import { OutboundRowFragment } from '../api/operations.generated';
import { Footer } from './Footer';

const useDisableOutboundRows = (rows?: OutboundRowFragment[]) => {
  const { setDisabledRows } = useTableStore();
  useEffect(() => {
    const disabledRows = rows?.filter(isOutboundDisabled).map(({ id }) => id);
    if (disabledRows) setDisabledRows(disabledRows);
  }, [rows, setDisabledRows]);
};

const OutboundShipmentListViewComponent: FC = () => {
  const { tableUsabilityImprovements } = useFeatureFlags();
  const { mutate: onUpdate } = useOutbound.document.update();
  const t = useTranslation();
  const {
    updateSortQuery,
    updatePaginationQuery,
    filter,
    queryParams: { sortBy, page, first, offset },
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
  const navigate = useNavigate();
  const modalController = useToggle();
  const pagination = { page, first, offset };
  const queryParams = { ...filter, sortBy, first, offset };
  const simplifiedTabletView = useSimplifiedTabletUI();

  const { data, isError, isLoading } = useOutbound.document.list(queryParams);
  useDisableOutboundRows(data?.nodes);

  const columns = useColumns<OutboundRowFragment>(
    [
      GenericColumnKey.Selection,
      [
        getNameAndColorColumn(),
        { setter: onUpdate, defaultHideOnMobile: true },
      ],
      [
        'status',
        {
          formatter: status =>
            getStatusTranslator(t)(status as InvoiceNodeStatus),
        },
      ],
      [
        'invoiceNumber',
        { description: 'description.invoice-number', width: 150 },
      ],
      'createdDatetime',
      {
        description: 'description.customer-reference',
        key: 'theirReference',
        label: 'label.reference',
        Cell: TooltipTextCell,
        width: 175,
        defaultHideOnMobile: true,
      },
      getCommentPopoverColumn(),
      [
        'totalAfterTax',
        {
          accessor: ({ rowData }) => rowData.pricing.totalAfterTax,
          width: 125,
          defaultHideOnMobile: true,
        },
      ],
    ],
    { onChangeSortBy: updateSortQuery, sortBy },
    [sortBy]
  );

  const mrtColumns = useMemo(
    (): ColumnDef<OutboundRowFragment>[] => [
      {
        header: t('label.name'),
        accessorKey: 'otherPartyName',
        ...getNameAndColorSetterColumn<OutboundRowFragment>(
          onUpdate,
          isOutboundDisabled
        ),
        enableColumnFilter: true,
        enableSorting: true,
        defaultHideOnMobile: true,
      },
      {
        accessorFn: row => getStatusTranslator(t)(row.status),
        id: 'status',
        header: t('label.status'),
        size: 140,
        enableSorting: true,
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
        meta: { columnLabel: 'SOmething else' },
        columnType: ColumnType.Comment,
      },
    ],
    []
  );

  const { table, selectedRows, resetRowSelection } =
    usePaginatedMaterialTable<OutboundRowFragment>({
      tableId: 'outbound-shipment-list-view',
      isLoading,
      onRowClick: row => navigate(row.id),
      columns: mrtColumns,
      data: data?.nodes ?? [],
      totalCount: data?.totalCount ?? 0,
      initialSort: { key: 'invoiceNumber', dir: 'desc' },
      getIsRestrictedRow: isOutboundDisabled,
    });

  return (
    <>
      <Toolbar filter={filter} simplifiedTabletView={simplifiedTabletView} />
      <AppBarButtons
        modalController={modalController}
        simplifiedTabletView={simplifiedTabletView}
      />
      {tableUsabilityImprovements ? (
        <MaterialTable table={table} />
      ) : (
        <DataTable
          id="outbound-list"
          enableColumnSelection
          pagination={{ ...pagination, total: data?.totalCount ?? 0 }}
          onChangePage={updatePaginationQuery}
          columns={columns}
          data={data?.nodes ?? []}
          isError={isError}
          isLoading={isLoading}
          noDataElement={
            <NothingHere
              body={t('error.no-outbound-shipments')}
              onCreate={modalController.toggleOn}
            />
          }
          onRowClick={row => {
            navigate(row.id);
          }}
        />
      )}
      <Footer
        selectedRows={selectedRows}
        resetRowSelection={resetRowSelection}
      />
    </>
  );
};

export const OutboundShipmentListView: FC = () => (
  <TableProvider createStore={createTableStore}>
    <OutboundShipmentListViewComponent />
  </TableProvider>
);
