import React, { FC } from 'react';
import {
  TableProvider,
  DataTable,
  useColumns,
  createTableStore,
  useTranslation,
  NothingHere,
  useUrlQueryParams,
  DateUtils,
  useEditModal,
  IconButton,
  CellProps,
  useToggle,
  StockIcon,
  ColumnAlign,
  ColumnDescription,
  usePluginColumns,
  TooltipTextCell,
} from '@openmsupply-client/common';
import { RepackModal, StockLineEditModal } from '../Components';
import { StockLineRowFragment, useStock } from '../api';
import { AppBarButtons } from './AppBarButtons';
import { Toolbar } from './Toolbar';

const StockListComponent: FC = () => {
  const {
    filter,
    updatePaginationQuery,
    updateSortQuery,
    queryParams: { sortBy, page, first, offset, filterBy },
  } = useUrlQueryParams({
    initialSort: { key: 'expiryDate', dir: 'asc' },
    filters: [
      { key: 'itemCodeOrName' },
      {
        key: 'location.code',
      },
      {
        key: 'expiryDate',
        condition: 'between',
      },
    ],
  });
  const queryParams = {
    filterBy,
    offset,
    sortBy,
    first,
  };

  const pagination = { page, first, offset };
  const t = useTranslation('inventory');
  const { data, isLoading, isError } = useStock.line.list(queryParams);
  const [repackId, setRepackId] = React.useState<string | null>(null);
  const pluginColumns = usePluginColumns<StockLineRowFragment>({
    type: 'Stock',
  });
  const EditStockLineCell = <T extends StockLineRowFragment>({
    rowData,
    isDisabled,
  }: CellProps<T>): React.ReactElement<CellProps<T>> => (
    <IconButton
      label={t('button.repack')}
      height="16px"
      disabled={isDisabled}
      icon={
        <StockIcon
          sx={{
            color: 'primary.main',
            width: '12px',
            cursor: 'pointer',
          }}
        />
      }
      onClick={e => {
        e.stopPropagation();
        repackModalController.toggleOn();
        setRepackId(rowData.id);
      }}
    />
  );

  const columnDefinitions: ColumnDescription<StockLineRowFragment>[] = [
    {
      key: 'edit',
      label: 'label.repack',
      Cell: EditStockLineCell,
      width: 75,
      sortable: false,
      align: ColumnAlign.Center,
    },
    [
      'itemCode',
      {
        accessor: ({ rowData }) => rowData.item.code,
        Cell: TooltipTextCell,
        width: 100,
      },
    ],
    [
      'itemName',
      {
        accessor: ({ rowData }) => rowData.item.name,
        Cell: TooltipTextCell,
        width: 350,
      },
    ],
    ['batch', { Cell: TooltipTextCell, width: 100 }],
    [
      'expiryDate',
      {
        accessor: ({ rowData }) => DateUtils.getDateOrNull(rowData.expiryDate),
        width: 110,
      },
    ],
    [
      'location',
      {
        Cell: TooltipTextCell,
        width: 100,
        accessor: ({ rowData }) => rowData.location?.code,
      },
    ],
    [
      'itemUnit',
      {
        accessor: ({ rowData }) => rowData.item.unitName,
        sortable: false,
        Cell: TooltipTextCell,
        width: 75,
      },
    ],
    ['packSize', { Cell: TooltipTextCell, width: 125 }],
    [
      'numberOfPacks',
      {
        accessor: ({ rowData }) => rowData.totalNumberOfPacks,
        Cell: TooltipTextCell,
        width: 150,
      },
    ],
    [
      'stockOnHand',
      {
        accessor: ({ rowData }) =>
          rowData.totalNumberOfPacks * rowData.packSize,
        label: 'label.soh',
        description: 'description.soh',
        sortable: false,
        Cell: TooltipTextCell,
        width: 125,
      },
    ],
    {
      key: 'supplierName',
      label: 'label.supplier',
      accessor: ({ rowData }) =>
        rowData.supplierName ? rowData.supplierName : t('message.no-supplier'),
      Cell: TooltipTextCell,
      width: 190,
    },
    ...pluginColumns,
  ];

  const columns = useColumns<StockLineRowFragment>(
    columnDefinitions,
    {
      sortBy,
      onChangeSortBy: updateSortQuery,
    },
    [sortBy, pluginColumns]
  );

  const { isOpen, entity, onClose, onOpen } =
    useEditModal<StockLineRowFragment>();

  const repackModalController = useToggle();

  return (
    <>
      {repackModalController.isOn && (
        <RepackModal
          isOpen={repackModalController.isOn}
          onClose={repackModalController.toggleOff}
          stockLine={data?.nodes.find(({ id }) => id === repackId) ?? null}
        />
      )}
      {isOpen && entity && (
        <StockLineEditModal
          isOpen={isOpen}
          onClose={onClose}
          stockLine={entity}
        />
      )}
      <Toolbar filter={filter} />
      <AppBarButtons />
      <DataTable
        id="stock-list"
        pagination={{ ...pagination, total: data?.totalCount ?? 0 }}
        columns={columns}
        data={data?.nodes ?? []}
        onChangePage={updatePaginationQuery}
        noDataElement={<NothingHere body={t('error.no-stock')} />}
        isError={isError}
        isLoading={isLoading}
        enableColumnSelection
        onRowClick={onOpen}
      />
    </>
  );
};

export const StockListView: FC = () => (
  <TableProvider createStore={createTableStore}>
    <StockListComponent />
  </TableProvider>
);
