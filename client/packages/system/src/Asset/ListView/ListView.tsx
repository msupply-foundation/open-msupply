import React, { FC } from 'react';
import {
  // useNavigate,
  TableProvider,
  DataTable,
  useColumns,
  createTableStore,
  NothingHere,
  useTranslation,
  useUrlQueryParams,
  TooltipTextCell,
} from '@openmsupply-client/common';
import { AssetCatalogueItemFragment, useAssetData } from '../api';
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
  const { data, isError, isLoading } = useAssetData.document.list();
  const pagination = { page, first, offset };
  // const navigate = useNavigate();
  const t = useTranslation('catalogue');

  const columns = useColumns<AssetCatalogueItemFragment>(
    [
      ['code', { width: 150 }],
      {
        key: 'manufacturer',
        Cell: TooltipTextCell,
        width: 300,
        label: 'label.manufacturer',
      },
      {
        Cell: TooltipTextCell,
        key: 'model',
        label: 'label.model',
        width: 200,
      },
      {
        key: 'class',
        label: 'label.class',
        sortable: false,
        accessor: ({ rowData }) => rowData.assetClass?.name,
      },
      {
        key: 'category',
        label: 'label.category',
        sortable: false,
        accessor: ({ rowData }) => rowData.assetCategory?.name,
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
        // onRowClick={row => {
        //   navigate(`/catalogue/assets/${row.id}`);
        // }}
        noDataElement={<NothingHere body={t('error.no-items')} />}
      />
    </>
  );
};

export const AssetListView: FC = () => (
  <TableProvider createStore={createTableStore}>
    <AssetListComponent />
  </TableProvider>
);
