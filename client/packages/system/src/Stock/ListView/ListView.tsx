import React, { FC } from 'react';
import {
  TableProvider,
  DataTable,
  useListData,
  useColumns,
  createTableStore,
  useOmSupplyApi,
  usePagination,
  useTranslation,
  Column,
  getDataSorter,
  SortBy,
} from '@openmsupply-client/common';
import { Toolbar } from '../Components';
import { getStockListViewApi } from './api';
import { StockRow } from '../types';

export const StockListView: FC = () => {
  const { pagination } = usePagination();
  const t = useTranslation('common');
  const { api } = useOmSupplyApi();
  const [filterString, setFilterString] = React.useState<string>('');
  const [sortBy, setSortBy] = React.useState<SortBy<StockRow>>({
    key: 'itemName',
    direction: 'asc',
  });
  const { data, isLoading } = useListData(
    { initialSortBy: { key: 'itemName' } },
    ['stock', 'list'],
    getStockListViewApi(api)
  );
  const onChangeSortBy = (column: Column<StockRow>) => {
    const isDesc = column.key === sortBy.key ? !sortBy.isDesc : false;
    setSortBy({ key: column.key, isDesc, direction: isDesc ? 'desc' : 'asc' });
  };

  const columns = useColumns<StockRow>(
    [
      'itemCode',
      'itemName',
      'batch',
      'expiryDate',
      'locationName',
      'itemUnit',
      'packSize',
      'numberOfPacks',
    ],
    {
      sortBy,
      onChangeSortBy,
    },
    [sortBy]
  );

  const filterData = (row: StockRow) => {
    const re = RegExp(`^${filterString ?? '.'}`, 'i');
    return re.test(row.itemName) || re.test(row.itemCode);
  };

  const filteredSortedData =
    data?.filter(filterData).sort(getDataSorter(sortBy.key, !!sortBy.isDesc)) ??
    [];

  return (
    <TableProvider createStore={createTableStore}>
      <Toolbar onChangeFilter={setFilterString} filterString={filterString} />
      <DataTable
        pagination={{ ...pagination, total: filteredSortedData.length }}
        columns={columns}
        data={filteredSortedData.slice(
          pagination.offset,
          pagination.offset + pagination.first
        )}
        onChangePage={pagination.onChangePage}
        noDataMessage={t('error.no-items')}
        isLoading={isLoading}
      />
    </TableProvider>
  );
};
