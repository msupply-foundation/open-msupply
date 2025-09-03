import React, { FC, useEffect, useMemo, useState } from 'react';
import {
  MaterialReactTable,
  MRT_RowSelectionState as MRTRowSelectionState,
  useMaterialReactTable,
  type MRT_ColumnDef as MRTColumnDef,
} from 'material-react-table';
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
  useUrlQuery,
  useFeatureFlags,
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
  const { urlQuery, updateQuery } = useUrlQuery();
  const navigate = useNavigate();
  const modalController = useToggle();
  const pagination = { page, first, offset };
  const queryParams = { ...filter, sortBy, first, offset };
  const simplifiedTabletView = useSimplifiedTabletUI();
  const [rowSelection, setRowSelection] = useState<MRTRowSelectionState>({});

  const { data, isError, isLoading } = useOutbound.document.list(queryParams);
  useDisableOutboundRows(data?.nodes);

  // const [sorting, setSorting] = useState<MRT_SortingState>([]);

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

  const mrtColumns = useMemo<MRTColumnDef<OutboundRowFragment>[]>(
    () => [
      {
        accessorKey: 'otherPartyName',
        header: t('label.name'),
        // size: 150,
      },
      {
        accessorFn: row => getStatusTranslator(t)(row.status),
        id: 'status',
        header: t('label.status'),
        size: 140,
      },
      {
        accessorKey: 'invoiceNumber',
        header: t('label.invoice-number'),
        size: 140,
        muiTableBodyCellProps: {
          sx: {
            textAlign: 'right',
            fontSize: '14px',
            paddingRight: '3em',
          },
        },
      },
      {
        accessorKey: 'createdDatetime',
        header: t('label.created'),
        Cell: ({ cell }) =>
          new Date(cell.getValue<string>()).toLocaleDateString(),
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

  // console.log('data', data?.nodes);
  // console.log('Sorting', sortBy);

  const columnFilters = Object.entries(filter).map(([id, value]) => ({
    id,
    value,
  }));

  // console.log('filter', filter);

  const table = useMaterialReactTable({
    columns: mrtColumns,
    data: data?.nodes ?? [],
    manualFiltering: true,
    manualPagination: true,
    manualSorting: true,
    onSortingChange: sortUpdate => {
      if (typeof sortUpdate === 'function') {
        const newSortValue = sortUpdate([
          { id: sortBy.key, desc: !!sortBy.isDesc },
        ])[0];
        // console.log('Sorting changed:', newSortValue);
        if (newSortValue)
          updateSortQuery(newSortValue.id, newSortValue.desc ? 'desc' : 'asc');
      }
    },
    onPaginationChange: pagination => {
      const current = { pageIndex: page, pageSize: first };
      if (typeof pagination === 'function') {
        // console.log('current', current);
        const newPaginationValue = pagination(current);
        // console.log('Pagination changed:', newPaginationValue);
        updatePaginationQuery(newPaginationValue.pageIndex);
      }
    },
    onColumnFiltersChange: columnFilters => {
      if (typeof columnFilters === 'function') {
        const newFilter = columnFilters([]);
        // console.log('Column filters changed:', newFilter);
        // @ts-expect-error -- temporary
        updateQuery({
          ...urlQuery,

          ...Object.fromEntries(newFilter.map(f => [f.id, f.value])),
        });
      }
    },
    muiPaginationProps: {
      showRowsPerPage: false,
      // rowsPerPageOptions: [], // Remove the dropdown
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    rowCount: data?.totalCount ?? 0,
    state: {
      sorting: [{ id: sortBy.key, desc: !!sortBy.isDesc }],
      pagination: { pageIndex: pagination.page, pageSize: pagination.first },
      showProgressBars: isLoading,
      columnFilters,
      rowSelection,
    },
    // enableColumnResizing: true,
    // muiTableContainerProps: {
    //   sx: { maxHeight: '600px', width: '100%' },
    // },
    // muiTableBodyProps: {
    //   sx: { border: '1px solid blue', width: '100%' },
    // },
    muiTableBodyRowProps: ({ row, staticRowIndex }) => ({
      onClick: () => navigate(row.original.id),
      sx: {
        backgroundColor: staticRowIndex % 2 === 0 ? 'transparent' : '#fafafb', // light grey on odd rows
        '& td': {
          borderBottom: '1px solid rgba(224, 224, 224, 1)', // add bottom border to each cell
        },
      },
    }),
    // muiTableProps: {
    //   sx: {
    //     // tableLayout: 'fixed', // ensures columns share extra space
    //   },
    // },
    muiTableHeadCellProps: {
      sx: {
        fontSize: '14px',
        lineHeight: 1.2,
        verticalAlign: 'bottom',
        // border: '1px solid red',
        '& .MuiBox-root': {
          whiteSpace: 'normal',
          overflow: 'visible',
          textOverflow: 'unset',
          wordBreak: 'break-word',
          alignItems: 'flex-end',
        },
      },
    },
    muiTableBodyCellProps: {
      sx: {
        fontSize: '14px',
        borderBottom: '1px solid rgba(224, 224, 224, 1)',
      },
    },
  });

  // const selected = table.getSelectedRowModel().rows;

  // console.log('selected', selected);

  return (
    <>
      <Toolbar filter={filter} simplifiedTabletView={simplifiedTabletView} />
      <AppBarButtons
        modalController={modalController}
        simplifiedTabletView={simplifiedTabletView}
      />
      {tableUsabilityImprovements ? (
        <div style={{ width: '100%' }}>
          <MaterialReactTable table={table} />
        </div>
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
      <Footer selectedRows={table.getSelectedRowModel().rows} />
    </>
  );
};

export const OutboundShipmentListView: FC = () => (
  <TableProvider createStore={createTableStore}>
    <OutboundShipmentListViewComponent />
  </TableProvider>
);
