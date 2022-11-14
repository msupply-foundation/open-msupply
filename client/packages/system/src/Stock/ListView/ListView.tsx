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
  useNavigate,
  RouteBuilder,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
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
  const navigate = useNavigate();

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
    const re = RegExp(
      `^${filterString ? RegexUtils.escapeChars(filterString) : '.'}`,
      'i'
    );
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
        id="stock-list"
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
        generateRowTooltip={({ itemName }) =>
          t('messages.click-to-view-item', { itemName })
        }
        onRowClick={row => {
          navigate(
            RouteBuilder.create(AppRoute.Catalogue)
              .addPart(AppRoute.Items)
              .addPart(row.itemId)
              .build()
          );
        }}
      />
    </>
  );
};

export const StockListView: FC = () => (
  <TableProvider createStore={createTableStore}>
    <StockListComponent />
  </TableProvider>
);
