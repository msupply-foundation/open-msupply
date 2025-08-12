import React, { useEffect } from 'react';
import {
  useNavigate,
  DataTable,
  useColumns,
  TableProvider,
  createTableStore,
  useTranslation,
  useTableStore,
  NothingHere,
  useUrlQueryParams,
  ColumnFormat,
  GenericColumnKey,
  getCommentPopoverColumn,
  useFormatDateTime,
  useAuthContext,
} from '@openmsupply-client/common';
import { Toolbar } from './Toolbar';
import { AppBarButtons } from './AppBarButtons';
import { getStocktakeTranslator, isStocktakeDisabled } from '../../utils';
import { StocktakeRowFragment } from '../api/operations.generated';
import { useStocktakeOld } from '../api';
import { Footer } from './Footer';
import { useStocktake } from '../api/hooks/useStocktake';
import { useStocktakeList } from '../api/hooks/useStocktakeList';

const useDisableStocktakeRows = (rows?: StocktakeRowFragment[]) => {
  const { setDisabledRows } = useTableStore();
  useEffect(() => {
    const disabledRows = rows?.filter(isStocktakeDisabled).map(({ id }) => id);
    if (disabledRows) setDisabledRows(disabledRows);
  }, [rows]);
};

export const StocktakeListView = () => {
  const t = useTranslation();
  const navigate = useNavigate();
  const { localisedDate } = useFormatDateTime();
  const { user } = useAuthContext();
  const {
    updateSortQuery,
    updatePaginationQuery,
    filter,
    queryParams: { sortBy, page, first, offset },
  } = useUrlQueryParams({
    filters: [{ key: 'status', condition: 'equalTo' }],
  });
  const pagination = { page, first, offset };
  const queryParams = { ...filter, sortBy, first, offset };

  const {
    query: { data, isError, isLoading },
  } = useStocktakeList(queryParams);
  const { data: hasStocktake, isLoading: firstStocktakeLoading } =
    useStocktakeOld.document.hasStocktake();
  const {
    create: { create, isCreating },
  } = useStocktake();
  useDisableStocktakeRows(data?.nodes);

  const statusTranslator = getStocktakeTranslator(t);
  const description = t('stocktake.description-template', {
    username: user ? user.name : 'unknown user',
    date: localisedDate(new Date()),
  });

  const columns = useColumns<StocktakeRowFragment>(
    [
      GenericColumnKey.Selection,
      [
        'stocktakeNumber',
        { maxWidth: 75, sortable: false, defaultHideOnMobile: true },
      ],
      [
        'status',
        {
          accessor: ({ rowData }) =>
            rowData.isLocked
              ? t('label.stocktake-on-hold')
              : statusTranslator(rowData.status),
        },
      ],
      ['description', { sortable: false }],
      ['createdDatetime', { format: ColumnFormat.Date }],
      ['stocktakeDate', { sortable: false, defaultHideOnMobile: true }],
      getCommentPopoverColumn(),
    ],
    { onChangeSortBy: updateSortQuery, sortBy },
    [sortBy]
  );

  const createInitialStocktake = (hasStockTake: boolean) => {
    const comment = hasStockTake
      ? '' // No comment for subsequent stocktakes
      : t('stocktake.comment-initial-stocktake-template');
    create({
      comment,
      description,
      isInitialStocktake: !hasStockTake,
    }).then(id => {
      if (id) {
        navigate(String(id));
      }
    });
  };

  return (
    <>
      <Toolbar filter={filter} />
      <AppBarButtons
        description={description}
        onCreate={create}
        isCreating={isCreating}
      />
      <DataTable
        id="stocktake-list"
        pagination={{ ...pagination, total: data?.totalCount ?? 0 }}
        onChangePage={updatePaginationQuery}
        columns={columns}
        data={data?.nodes ?? []}
        isError={isError}
        isLoading={isLoading || firstStocktakeLoading}
        onRowClick={row => {
          navigate(String(row.id));
        }}
        noDataElement={
          <NothingHere
            body={t('error.no-stocktakes')}
            onCreate={() => createInitialStocktake(hasStocktake ?? false)}
            buttonText={
              hasStocktake
                ? t('button.create-a-new-one')
                : t('button.initial-stocktake')
            }
          />
        }
      />
      <Footer />
    </>
  );
};

export const ListView = () => (
  <TableProvider createStore={createTableStore}>
    <StocktakeListView />
  </TableProvider>
);
