import React, { FC } from 'react';
import {
  TableProvider,
  DataTable,
  useColumns,
  createTableStore,
  NothingHere,
  useTranslation,
  useUrlQueryParams,
  TooltipTextCell,
  useToggle,
  useIsCentralServerApi,
  ColumnDescription,
  GenericColumnKey,
} from '@openmsupply-client/common';
import { AssetCatalogueItemFragment, useAssetList } from '../api';
import { Toolbar } from './Toolbar';
import { AppBarButtons } from './AppBarButtons';
import { AssetCatalogueItemImportModal } from '../ImportCatalogueItem';
import { Footer } from './Footer';

const AssetListComponent: FC = () => {
  const isCentralServer = useIsCentralServerApi();
  const {
    updateSortQuery,
    updatePaginationQuery,
    queryParams: { sortBy, page, first, offset, filterBy },
  } = useUrlQueryParams({
    initialSort: { key: 'code', dir: 'asc' },
    filters: [
      { key: 'categoryId', condition: 'equalTo' },
      { key: 'code' },
      { key: 'manufacturer' },
      { key: 'model' },
      { key: 'typeId', condition: 'equalTo' },
      { key: 'subCatalogue' },
    ],
  });
  const {
    query: { data, isError, isLoading },
  } = useAssetList({
    first,
    offset,
    sortBy,
    filterBy,
  });
  const pagination = { page, first, offset };
  const t = useTranslation();
  const importModalController = useToggle();

  const columnDescriptions: ColumnDescription<AssetCatalogueItemFragment>[] = [
    ...(isCentralServer ? [GenericColumnKey.Selection] : []),
    {
      key: 'subCatalogue',
      label: 'label.sub-catalogue',
      sortable: true,
      width: 165,
    },
    ['code', { width: 150 }],
    {
      key: 'type',
      label: 'label.type',
      sortable: false,
      accessor: ({ rowData }) => rowData.assetType?.name,
    },
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
  ];

  const columns = useColumns<AssetCatalogueItemFragment>(
    columnDescriptions,
    {
      sortBy,
      onChangeSortBy: updateSortQuery,
    },

    [sortBy]
  );

  return (
    <>
      <AssetCatalogueItemImportModal
        isOpen={importModalController.isOn}
        onClose={importModalController.toggleOff}
      />
      <AppBarButtons
        importModalController={importModalController}
        assets={data?.nodes ?? []}
      />
      <Toolbar />
      <DataTable
        id="item-list"
        pagination={{ ...pagination, total: data?.totalCount ?? 0 }}
        onChangePage={updatePaginationQuery}
        columns={columns}
        data={data?.nodes}
        isError={isError}
        isLoading={isLoading}
        noDataElement={<NothingHere body={t('error.no-assets')} />}
        enableColumnSelection
      />
      <Footer />
    </>
  );
};

export const AssetListView: FC = () => (
  <TableProvider createStore={createTableStore}>
    <AssetListComponent />
  </TableProvider>
);
