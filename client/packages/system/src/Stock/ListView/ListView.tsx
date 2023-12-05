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
        key: 'location.name',
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
      maxWidth: 75,
      minWidth: 75,
      sortable: false,
      align: ColumnAlign.Center,
    },
    [
      'itemCode',
      {
        accessor: ({ rowData }) => rowData.item.code,
        Cell: TooltipTextCell,
        maxWidth: 100,
        minWidth: 100,
      },
    ],
    [
      'itemName',
      {
        accessor: ({ rowData }) => rowData.item.name,
        Cell: TooltipTextCell,
        maxWidth: 350,
        minWidth: 350,
      },
    ],
    ['batch', { Cell: TooltipTextCell, maxWidth: 100, minWidth: 100 }],
    [
      'expiryDate',
      {
        accessor: ({ rowData }) => DateUtils.getDateOrNull(rowData.expiryDate),
        maxWidth: 110,
        minWidth: 110,
      },
    ],
    [
      'locationName',
      { sortable: false, Cell: TooltipTextCell, maxWidth: 75, minWidth: 75 },
    ],
    [
      'itemUnit',
      {
        accessor: ({ rowData }) => rowData.item.unitName,
        sortable: false,
        Cell: TooltipTextCell,
        maxWidth: 75,
        minWidth: 75,
      },
    ],
    ['packSize', { Cell: TooltipTextCell, maxWidth: 125, minWidth: 125 }],
    [
      'numberOfPacks',
      {
        accessor: ({ rowData }) => rowData.totalNumberOfPacks,
        Cell: TooltipTextCell,
        maxWidth: 150,
        minWidth: 150,
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
        maxWidth: 125,
        minWidth: 125,
      },
    ],
    {
      key: 'supplierName',
      label: 'label.supplier',
      accessor: ({ rowData }) =>
        rowData.supplierName ? rowData.supplierName : t('message.no-supplier'),
      Cell: TooltipTextCell,
      maxWidth: 190,
      minWidth: 190,
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
