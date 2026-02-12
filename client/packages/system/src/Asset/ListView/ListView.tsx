import React, { FC, useMemo } from 'react';
import {
  useTranslation,
  useUrlQueryParams,
  TextWithTooltipCell,
  useToggle,
  useIsCentralServerApi,
  ColumnDef,
  usePaginatedMaterialTable,
  MaterialTable,
  NothingHere,
  useUrlQuery,
} from '@openmsupply-client/common';
import { AssetCatalogueItemFragment, useAssetList } from '../api';
import { AppBarButtons } from './AppBarButtons';
import { AssetCatalogueItemImportModal } from '../ImportCatalogueItem';
import { Footer } from './Footer';
import { useAssetTypes } from '../api/hooks';
import { mapIdNameToOptions } from '../utils';
import { useAssetCategories } from '@openmsupply-client/system';

export const AssetListView: FC = () => {
  const { data: categoryData } = useAssetCategories();
  const { data: typeData } = useAssetTypes();

  const { urlQuery } = useUrlQuery({
    skipParse: ['classId', 'categoryId', 'typeId'],
  });

  const categoryId = urlQuery['categoryId'];

  // only show type options in the filter which are relevant for the selected category
  const filteredTypes = (typeData?.nodes || []).filter(
    type => !categoryId || type.categoryId === categoryId
  );

  const t = useTranslation();
  const importModalController = useToggle();
  const isCentralServer = useIsCentralServerApi();

  const {
    queryParams,
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
  } = useAssetList(queryParams);

  const columns = useMemo(
    (): ColumnDef<AssetCatalogueItemFragment>[] => [
      {
        header: t('label.sub-catalogue'),
        accessorKey: 'subCatalogue',
        size: 165,
        enableSorting: true,
        enableColumnFilter: true,
      },
      {
        header: t('label.code'),
        accessorKey: 'code',
        size: 150,
        enableSorting: true,
        enableColumnFilter: true,
      },
      {
        header: t('label.type'),
        id: 'typeId',
        accessorFn: row => row.assetType?.name,
        enableColumnFilter: true,
        filterVariant: 'select',
        filterSelectOptions: mapIdNameToOptions(filteredTypes),
      },
      {
        header: t('label.manufacturer'),
        accessorKey: 'manufacturer',
        Cell: TextWithTooltipCell,
        size: 300,
        enableSorting: true,
        enableColumnFilter: true,
      },
      {
        header: t('label.model'),
        accessorKey: 'model',
        Cell: TextWithTooltipCell,
        size: 200,
        enableSorting: true,
        enableColumnFilter: true,
      },
      {
        header: t('label.class'),
        id: 'classId',
        accessorFn: row => row.assetClass?.name,
      },
      {
        header: t('label.category'),
        id: 'categoryId',
        accessorFn: row => row.assetCategory?.name,
        enableColumnFilter: true,
        filterVariant: 'select',
        filterSelectOptions: mapIdNameToOptions(categoryData?.nodes || []),
      },
    ],
    [filteredTypes],
  );

  const { table, selectedRows } =
    usePaginatedMaterialTable<AssetCatalogueItemFragment>({
      tableId: 'asset-list-view',
      isLoading,
      isError,
      columns,
      data: data?.nodes ?? [],
      enableRowSelection: isCentralServer,
      totalCount: data?.totalCount ?? 0,
      noDataElement: (
        <NothingHere
          body={t('error.no-assets')}
          onCreate={importModalController.toggleOn}
        />
      ),
    });

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

      <MaterialTable table={table} />

      <Footer
        selectedRows={selectedRows}
        resetRowSelection={table.resetRowSelection}
      />
    </>
  );
};
