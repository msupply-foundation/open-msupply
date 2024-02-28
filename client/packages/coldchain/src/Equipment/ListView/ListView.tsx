import React, { FC } from 'react';
import {
  useNavigate,
  TableProvider,
  DataTable,
  useColumns,
  createTableStore,
  NothingHere,
  useTranslation,
  useUrlQueryParams,
  TooltipTextCell,
} from '@openmsupply-client/common';
import { AssetFragment, useAssets } from '../api';
import { Toolbar } from './Toolbar';
import { AppBarButtons } from './AppBarButtons';

const AssetListComponent: FC = () => {
  const {
    updateSortQuery,
    updatePaginationQuery,
    queryParams: { sortBy, page, first, offset },
  } = useUrlQueryParams({
    initialSort: { key: 'code', dir: 'asc' },
    filters: [
      { key: 'manufacturer' },
      { key: 'model' },
      { key: 'category' },
      { key: 'class' },
      { key: 'type' },
    ],
  });
  const { data, isError, isLoading } = useAssets.document.list();
  const pagination = { page, first, offset };
  const navigate = useNavigate();
  const t = useTranslation('catalogue');

  const columns = useColumns<AssetFragment>(
    [
      ['code', { width: 150 }],
      {
        key: 'manufacturer',
        Cell: TooltipTextCell,
        maxWidth: 350,
        label: 'label.manufacturer',
      },
      {
        key: 'model',
        label: 'label.model',
      },
    ],
    {
      sortBy,
      onChangeSortBy: updateSortQuery,
    },
    [sortBy]
  );

  return (
    <>
      <AppBarButtons />
      <Toolbar />
      <DataTable
        id="item-list"
        pagination={{ ...pagination, total: data?.totalCount ?? 0 }}
        onChangePage={updatePaginationQuery}
        columns={columns}
        data={data?.nodes}
        isError={isError}
        isLoading={isLoading}
        onRowClick={row => {
          navigate(`/catalogue/assets/${row.id}`);
        }}
        noDataElement={<NothingHere body={t('error.no-items')} />}
      />
    </>
  );
};

export const EquipmentListView: FC = () => (
  <TableProvider createStore={createTableStore}>
    <AssetListComponent />
  </TableProvider>
);
