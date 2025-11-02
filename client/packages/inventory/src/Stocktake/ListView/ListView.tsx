import React, { useMemo } from 'react';
import {
  useNavigate,
  useTranslation,
  NothingHere,
  useUrlQueryParams,
  useFormatDateTime,
  useAuthContext,
  usePaginatedMaterialTable,
  ColumnDef,
  ColumnType,
  StocktakeNodeStatus,
  MaterialTable,
} from '@openmsupply-client/common';
import { AppBarButtons } from './AppBarButtons';
import { getStocktakeTranslator, isStocktakeDisabled } from '../../utils';
import { StocktakeRowFragment } from '../api/operations.generated';
import { Footer } from './Footer';
import { useStocktake } from '../api/hooks/useStocktake';
import { useStocktakeList } from '../api/hooks/useStocktakeList';

export const ListView = () => {
  const t = useTranslation();
  const navigate = useNavigate();
  const { localisedDate } = useFormatDateTime();
  const { user } = useAuthContext();
  const {
    filter,
    queryParams: { sortBy, first, offset },
  } = useUrlQueryParams({
    filters: [
      { key: 'status', condition: 'equalTo' },
      { key: 'createdDatetime', condition: 'between' },
    ],
  });
  const queryParams = { ...filter, sortBy, first, offset };

  const {
    query: { data, isError, isFetching },
    hasStocktake,
  } = useStocktakeList(queryParams);
  const {
    create: { create, isCreating },
  } = useStocktake();

  const statusTranslator = getStocktakeTranslator(t);
  const description = t('stocktake.description-template', {
    username: user ? user.name : 'unknown user',
    date: localisedDate(new Date()),
  });

  const columns = useMemo(
    (): ColumnDef<StocktakeRowFragment>[] => [
      {
        accessorKey: 'stocktakeNumber',
        header: t('label.number'),
        defaultHideOnMobile: true,
        enableSorting: true,
      },
      {
        id: 'status',
        header: t('label.status'),
        enableSorting: true,
        accessorFn: row =>
          row.isLocked
            ? t('label.stocktake-on-hold')
            : statusTranslator(row.status),
        enableColumnFilter: true,
        filterVariant: 'select',
        filterSelectOptions: [
          { label: t('status.new'), value: StocktakeNodeStatus.New },
          {
            label: t('status.finalised'),
            value: StocktakeNodeStatus.Finalised,
          },
        ],
      },
      {
        accessorKey: 'description',
        header: t('label.description'),
      },
      {
        id: 'createdDatetime',
        accessorFn: row => new Date(row.createdDatetime),
        header: t('label.created'),
        columnType: ColumnType.Date,
        enableSorting: true,
        enableColumnFilter: true,
      },
      {
        accessorKey: 'comment',
        header: t('label.comment'),
        columnType: ColumnType.Comment,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const { table, selectedRows } =
    usePaginatedMaterialTable<StocktakeRowFragment>({
      tableId: 'stocktake-list',
      isLoading: isFetching,
      isError,
      onRowClick: row => navigate(row.id),
      columns,
      data: data?.nodes,
      totalCount: data?.totalCount ?? 0,
      getIsRestrictedRow: isStocktakeDisabled,
      noDataElement: (
        <NothingHere
          body={t('error.no-stocktakes')}
          onCreate={() => createInitialStocktake(hasStocktake ?? false)}
          buttonText={
            hasStocktake
              ? t('button.create-a-new-one')
              : t('button.initial-stocktake')
          }
        />
      ),
    });

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
      <AppBarButtons
        description={description}
        onCreate={create}
        isCreating={isCreating}
      />
      <MaterialTable table={table} />
      <Footer
        selectedRows={selectedRows}
        resetSelection={table.resetRowSelection}
      />
    </>
  );
};
