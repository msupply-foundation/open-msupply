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
  ColumnAlign,
  TooltipTextCell,
  useToggle,
} from '@openmsupply-client/common';
import { useAssets, ItemRowFragment } from '../api';
import { Toolbar } from './Toolbar';
import { AppBarButtons } from './AppBarButtons';

const AssetListComponent: FC = () => {
  const {
    updateSortQuery,
    updatePaginationQuery,
    queryParams: { sortBy, page, first, offset },
  } = useUrlQueryParams({
    initialSort: { key: 'name', dir: 'asc' },
    filters: [{ key: 'codeOrName' }],
  });
  const { data, isError, isLoading } = useAssets.document.list();
  const pagination = { page, first, offset };
  const navigate = useNavigate();
  const t = useTranslation('catalogue');
  const modalController = useToggle();

  const columns = useColumns<ItemRowFragment>(
    [
      ['code', { width: 75 }],
      [
        'name',
        {
          Cell: TooltipTextCell,
          maxWidth: 350,
        },
      ],
      {
        accessor: ({ rowData }) => rowData.unitName ?? '',
        align: ColumnAlign.Right,
        key: 'unitName',
        label: 'label.unit',
        sortable: false,
        width: 100,
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
      <AppBarButtons modalController={modalController} />
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

export const AssetListView: FC = () => (
  <TableProvider createStore={createTableStore}>
    <AssetListComponent />
  </TableProvider>
);
