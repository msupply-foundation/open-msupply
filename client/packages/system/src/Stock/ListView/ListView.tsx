import React, { FC } from 'react';
import {
  TableProvider,
  DataTable,
  useColumns,
  createTableStore,
  usePagination,
  useTranslation,
  Column,
  SortUtils,
  SortBy,
  RegexUtils,
  NothingHere,
  createQueryParamsStore,
} from '@openmsupply-client/common';
import { Toolbar } from '../Components';
import { useStockLines } from '../api';
import { StockRow } from '../types';

const StockListComponent: FC = () => {
  const { pagination } = usePagination();
  const t = useTranslation('inventory');
  const [filterString, setFilterString] = React.useState<string>('');
  const [sortBy, setSortBy] = React.useState<SortBy<StockRow>>({
    key: 'itemName',
    direction: 'asc',
  });
  const { data, isLoading, isError } = useStockLines();
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
    const re = RegExp(`^${RegexUtils.escapeChars(filterString) ?? '.'}`, 'i');
    return re.test(row.itemName) || re.test(row.itemCode);
  };

  const filteredSortedData =
    data?.nodes
      .filter(filterData)
      .sort(SortUtils.getDataSorter(sortBy.key, !!sortBy.isDesc)) ?? [];

  return (
    <>
      <Toolbar onChangeFilter={setFilterString} filterString={filterString} />
      <DataTable
        pagination={{ ...pagination, total: filteredSortedData.length }}
        columns={columns}
        data={filteredSortedData.slice(
          pagination.offset,
          pagination.offset + pagination.first
        )}
        onChangePage={pagination.onChangePage}
        noDataElement={<NothingHere body={t('error.no-stock')} />}
        isError={isError}
        isLoading={isLoading}
      />
    </>
  );
};

export const StockListView: FC = () => (
  <TableProvider
    createStore={createTableStore}
    queryParamsStore={createQueryParamsStore<StockRow>({
      initialSortBy: { key: 'itemName' },
    })}
  >
    <StockListComponent />
  </TableProvider>
);
