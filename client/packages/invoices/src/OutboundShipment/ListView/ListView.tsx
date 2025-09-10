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
  PaperHoverPopover,
  PaperPopoverSection,
  MessageSquareIcon,
  useFeatureFlags,
  MaterialTable,
  usePaginatedMaterialTable,
  ColumnDef,
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
        id: 'otherPartyName',
        header: t('label.name'),
        accessorKey: 'otherPartyName',
        size: 400,
        filterVariant: 'text',
        defaultHideOnMobile: true,
      },
      {
        accessorFn: row => getStatusTranslator(t)(row.status),
        id: 'status',
        header: t('label.status'),
        size: 140,
        filterVariant: 'select',
        filterSelectOptions: [
          { value: 'NEW', label: t('label.new') },
          { value: 'SHIPPED', label: t('label.shipped') },
          { value: 'ALLOCATED', label: t('label.allocated') },
          { value: 'PICKED', label: t('label.picked') },
        ],
      },
      {
        accessorKey: 'invoiceNumber',
        header: t('label.invoice-number'),
        size: 140,
        align: 'right',
      },
      {
        accessorKey: 'createdDatetime',
        header: t('label.created'),
        Cell: ({ cell }) =>
          new Date(cell.getValue<string>()).toLocaleDateString(),
        filterVariant: 'date-range',
        // size: 100,
      },
      {
        accessorKey: 'theirReference',
        header: t('label.reference'),
        // size: 100,
      },
      {
        accessorKey: 'comment',
        header: '',
        enableColumnActions: false,
        enableSorting: false,
        enableResizing: false,
        size: 20,
        // width: 0,
        Cell: ({ cell }) => {
          const t = useTranslation();
          const value = cell.getValue<string>();
          return value ? (
            <PaperHoverPopover
              width={400}
              Content={
                <PaperPopoverSection label={t('label.comment')}>
                  {String(value)}
                </PaperPopoverSection>
              }
            >
              <MessageSquareIcon sx={{ fontSize: 16 }} color="primary" />
            </PaperHoverPopover>
          ) : null;
        },
      },
      {
        accessorKey: 'pricing.totalAfterTax',
        header: t('label.total'),
        Cell: ({ cell }) =>
          new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
          }).format(cell.getValue<number>()),
        // size: 100,
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
