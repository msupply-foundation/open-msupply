import React, { useMemo } from 'react';
import {
  useIsCentralServerApi,
  usePathnameIncludes,
  ColumnDef,
  useTranslation,
  ColumnType,
  TextWithTooltipCell,
  AssetLogStatusNodeType,
  useUrlQuery,
} from '@openmsupply-client/common';
import {
  mapIdNameToOptions,
  useAssetCategories,
  useAssetTypes,
} from '@openmsupply-client/system';

import { Status } from '../Components';
import { AssetRowFragment } from '../api/operations.generated';
import { CCE_CLASS_ID } from '../utils';

export const useAssetColumns = () => {
  const t = useTranslation();
  const isColdChain = usePathnameIncludes('cold-chain');
  const isCentralServer = useIsCentralServerApi();

  const { urlQuery } = useUrlQuery();
  const categoryId = urlQuery['categoryId'];

  const { data: typeData } = useAssetTypes();
  const { data: categoryData } = useAssetCategories({
    classId: { equalTo: CCE_CLASS_ID },
  });

  const typeOptions = useMemo(() => {
    const options = (typeData?.nodes || []).filter(
      type => !categoryId || type.categoryId === categoryId
    );
    return mapIdNameToOptions(options);
  }, [typeData?.nodes, categoryId]);

  return useMemo(
    (): ColumnDef<AssetRowFragment>[] => [
      {
        id: 'store',
        header: t('label.store'),
        accessorFn: row => row.store?.storeName,
        enableSorting: true,
        enableColumnFilter: true,
        filterKey: 'storeCodeOrName',
        includeColumn: isCentralServer && !isColdChain,
      },
      {
        accessorKey: 'assetNumber',
        header: t('label.asset-number'),
        enableSorting: true,
        enableColumnFilter: true,
      },
      {
        id: 'categoryName',
        header: t('label.category'),
        accessorFn: row => row.assetCategory?.name,
        enableColumnFilter: true,
        filterVariant: 'select',
        filterKey: 'categoryId',
        filterSelectOptions: mapIdNameToOptions(categoryData?.nodes || []),
      },
      {
        id: 'type',
        header: t('label.type'),
        accessorFn: row => row.assetType?.name,
        enableColumnFilter: true,
        filterVariant: 'select',
        filterKey: 'typeId',
        filterSelectOptions: typeOptions,
      },
      {
        id: 'manufacturer',
        header: t('label.manufacturer'),
        accessorFn: row => row.catalogueItem?.manufacturer,
      },
      {
        id: 'model',
        header: t('label.model'),
        accessorFn: row => row.catalogueItem?.model,
      },
      {
        id: 'functionalStatus',
        header: t('label.functional-status'),
        accessorFn: row => row.statusLog?.status,
        Cell: ({ row }) => <Status status={row.original.statusLog?.status} />,
        enableColumnFilter: true,
        filterVariant: 'select',
        filterSelectOptions: [
          {
            label: t('status.decommissioned'),
            value: AssetLogStatusNodeType.Decommissioned,
          },
          {
            label: t('status.functioning'),
            value: AssetLogStatusNodeType.Functioning,
          },
          {
            label: t('status.functioning-but-needs-attention'),
            value: AssetLogStatusNodeType.FunctioningButNeedsAttention,
          },
          {
            label: t('status.not-functioning'),
            value: AssetLogStatusNodeType.NotFunctioning,
          },
          {
            label: t('status.not-in-use'),
            value: AssetLogStatusNodeType.NotInUse,
          },
          {
            label: t('status.unserviceable'),
            value: AssetLogStatusNodeType.Unserviceable,
          },
        ],
      },
      {
        id: 'serialNumber',
        accessorFn: row => row.serialNumber ?? '',
        header: t('label.serial'),
        enableSorting: true,
        enableColumnFilter: true,
      },
      {
        id: 'catalogueItem',
        header: t('label.non-catalogue'),
        accessorFn: row => !row.catalogueItem,
        columnType: ColumnType.Boolean,
        enableColumnFilter: true,
        filterVariant: 'select',
        filterSelectOptions: [
          { label: t('label.non-catalogue'), value: 'true' },
          { label: t('label.catalogue'), value: 'false' },
        ],
      },
      {
        id: 'installationDate',
        accessorFn: row => row.installationDate ?? '',
        header: t('label.installation-date'),
        columnType: ColumnType.Date,
        enableSorting: true,
        enableColumnFilter: true,
        dateFilterFormat: 'date',
      },
      {
        id: 'replacementDate',
        accessorFn: row => row.replacementDate ?? '',
        header: t('label.replacement-date'),
        columnType: ColumnType.Date,
        enableColumnFilter: true,
        dateFilterFormat: 'date',
      },
      {
        accessorKey: 'notes',
        header: t('label.notes'),
        Cell: TextWithTooltipCell,
        enableColumnFilter: true,
      },
    ],
    [typeOptions, categoryData?.nodes, isColdChain, isCentralServer]
  );
};
