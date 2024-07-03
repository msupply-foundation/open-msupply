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
} from '@openmsupply-client/common';
import { AssetCatalogueItemFragment, useAssetData } from '../api';
import { Toolbar } from './Toolbar';
import { AppBarButtons } from './AppBarButtons';
import { AssetCatalogueItemImportModal } from '../ImportCatalogueItem';
import { EditableInput } from './EditableInput';

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
      { key: 'catalogue' },
    ],
  });
  const { data, isError, isLoading } = useAssetData.document.list();
  const pagination = { page, first, offset };
  const t = useTranslation('catalogue');
  const importModalController = useToggle();

  const columns = useColumns<AssetCatalogueItemFragment>(
    [
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
        Cell: EditableInput,
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
      'selection',
    ],
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
      <AppBarButtons importModalController={importModalController} />
      <Toolbar />
      <DataTable
        id="item-list"
        pagination={{ ...pagination, total: data?.totalCount ?? 0 }}
        onChangePage={updatePaginationQuery}
        columns={columns}
        data={data?.nodes}
        isError={isError}
        isLoading={isLoading}
        noDataElement={<NothingHere body={t('error.no-items')} />}
        enableColumnSelection
      />
    </>
  );
};

export const AssetListView: FC = () => (
  <TableProvider createStore={createTableStore}>
    <AssetListComponent />
  </TableProvider>
);
