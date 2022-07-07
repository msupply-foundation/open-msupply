import React, { FC } from 'react';
import {
  TableProvider,
  DataTable,
  useColumns,
  createTableStore,
  useTranslation,
  SortUtils,
  RegexUtils,
  NothingHere,
  useUrlQuery,
  useUrlQueryParams,
} from '@openmsupply-client/common';
import { Toolbar } from '../Components';
import { useStock } from '../api';
import { StockRow } from '../types';

const StockListComponent: FC = () => {
  const { urlQuery, updateQuery } = useUrlQuery({ skipParse: ['filter'] });
  const {
    updatePaginationQuery,
    updateSortQuery,
    queryParams: { sortBy, page, first, offset },
  } = useUrlQueryParams({ initialSort: { key: 'itemName', dir: 'asc' } });
  const pagination = { page, first, offset };
  const t = useTranslation('inventory');
  const filterString = String(urlQuery.filter ?? '');

  const { data, isLoading, isError } = useStock.document.list();

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
      onChangeSortBy: updateSortQuery,
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
      <Toolbar
        onChangeFilter={updateQuery}
        filterString={urlQuery.filter ?? ''}
      />
      <DataTable
        pagination={{ ...pagination, total: filteredSortedData.length }}
        columns={columns}
        data={filteredSortedData.slice(
          pagination.offset,
          pagination.offset + pagination.first
        )}
        onChangePage={updatePaginationQuery}
        noDataElement={<NothingHere body={t('error.no-stock')} />}
        isError={isError}
        isLoading={isLoading}
      />
    </>
  );
};

export const StockListView: FC = () => (
  <TableProvider createStore={createTableStore}>
    <StockListComponent />
  </TableProvider>
);
