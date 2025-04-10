import React, { FC, useEffect } from 'react';
import {
  useNavigate,
  DataTable,
  useColumns,
  TableProvider,
  createTableStore,
  useTranslation,
  useTableStore,
  useToggle,
  NothingHere,
  useUrlQueryParams,
  ColumnFormat,
  GenericColumnKey,
  getCommentPopoverColumn,
  CardColumnType,
} from '@openmsupply-client/common';
import { Toolbar } from './Toolbar';
import { AppBarButtons } from './AppBarButtons';
import { getStocktakeTranslator, isStocktakeDisabled } from '../../utils';
import { StocktakeRowFragment } from '../api/operations.generated';
import { useStocktake } from '../api';
import { Footer } from './Footer';

const useDisableStocktakeRows = (rows?: StocktakeRowFragment[]) => {
  const { setDisabledRows } = useTableStore();
  useEffect(() => {
    const disabledRows = rows?.filter(isStocktakeDisabled).map(({ id }) => id);
    if (disabledRows) setDisabledRows(disabledRows);
  }, [rows]);
};

export const StocktakeListView: FC = () => {
  const navigate = useNavigate();
  const t = useTranslation();
  const modalController = useToggle();

  const {
    updateSortQuery,
    updatePaginationQuery,
    filter,
    queryParams: { sortBy, page, first, offset },
  } = useUrlQueryParams();
  const { data, isError, isLoading } = useStocktake.document.list();
  const pagination = { page, first, offset };
  useDisableStocktakeRows(data?.nodes);

  const statusTranslator = getStocktakeTranslator(t);

  const columns = useColumns<StocktakeRowFragment>(
    [
      GenericColumnKey.Selection,
      [
        'stocktakeNumber',
        {
          maxWidth: 75,
          sortable: false,
          cardColumnType: CardColumnType.Primary,
        },
      ],
      [
        'status',
        {
          accessor: ({ rowData }) =>
            rowData.isLocked
              ? t('label.stocktake-on-hold')
              : statusTranslator(rowData.status),
          cardColumnType: CardColumnType.Status,
        },
      ],
      ['description', { sortable: false }],
      ['createdDatetime', { format: ColumnFormat.Date }],
      ['stocktakeDate', { sortable: false }],
      getCommentPopoverColumn(),
    ],
    { onChangeSortBy: updateSortQuery, sortBy },
    [sortBy]
  );

  return (
    <>
      <Toolbar filter={filter} />
      <AppBarButtons modalController={modalController} />

      <DataTable
        id="stocktake-list"
        pagination={{ ...pagination, total: data?.totalCount ?? 0 }}
        onChangePage={updatePaginationQuery}
        columns={columns}
        data={data?.nodes ?? []}
        isError={isError}
        isLoading={isLoading}
        onRowClick={row => {
          navigate(String(row.id));
        }}
        noDataElement={
          <NothingHere
            body={t('error.no-stocktakes')}
            onCreate={modalController.toggleOn}
          />
        }
      />
      <Footer />
    </>
  );
};

export const ListView: FC = () => (
  <TableProvider createStore={createTableStore}>
    <StocktakeListView />
  </TableProvider>
);
