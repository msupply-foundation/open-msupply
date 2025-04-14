import React, { useEffect, useState } from 'react';
import {
  AppBarContentPortal,
  AssetLogStatusInput,
  Box,
  FilterDefinition,
  FilterMenu,
  useIsCentralServerApi,
  usePathnameIncludes,
  useTranslation,
  useUrlQuery,
} from '@openmsupply-client/common';
import { mapIdNameToOptions, useAssetTypes } from '@openmsupply-client/system';
import { CCE_CLASS_ID } from '../utils';
import { useAssetCategories } from '@openmsupply-client/system';

type ReferenceData = {
  id: string;
  name: string;
  categoryId?: string;
};

export const useToolbar = () => {
  const t = useTranslation();
  const isCentralServer = useIsCentralServerApi();
  const isColdChain = usePathnameIncludes('cold-chain');
  const [types, setTypes] = useState<ReferenceData[]>([]);

  const { data: typeData } = useAssetTypes();
  const { data: categoryData } = useAssetCategories({
    classId: { equalTo: CCE_CLASS_ID },
  });

  const { urlQuery, updateQuery } = useUrlQuery({
    skipParse: ['classId', 'categoryId', 'typeId'],
  });
  const categoryId = urlQuery['categoryId'];
  const typeId = urlQuery['typeId'];

  useEffect(() => {
    // only show type options in the filter which are relevant for the selected category
    const newTypes = (typeData?.nodes || []).filter(
      type => !categoryId || type.categoryId === categoryId
    );
    setTypes(newTypes);

    // reset the selected type if it is not under the selected category
    if (newTypes.find(t => t.name === typeId) === null) {
      updateQuery({ categoryId: '' });
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId, typeData]);

  const filters: FilterDefinition[] = [
    {
      type: 'boolean',
      name: t('label.non-catalogue'),
      urlParameter: 'isNonCatalogue',
    },
    {
      type: 'enum',
      name: t('label.functional-status'),
      urlParameter: 'functionalStatus',
      options: [
        {
          label: t('status.decommissioned'),
          value: AssetLogStatusInput.Decommissioned,
        },
        {
          label: t('status.functioning'),
          value: AssetLogStatusInput.Functioning,
        },
        {
          label: t('status.functioning-but-needs-attention'),
          value: AssetLogStatusInput.FunctioningButNeedsAttention,
        },
        {
          label: t('status.not-functioning'),
          value: AssetLogStatusInput.NotFunctioning,
        },
        {
          label: t('status.not-in-use'),
          value: AssetLogStatusInput.NotInUse,
        },
        {
          label: t('status.unserviceable'),
          value: AssetLogStatusInput.Unserviceable,
        },
      ],
      isDefault: true,
    },
    {
      type: 'enum',
      name: t('label.category'),
      urlParameter: 'categoryId',
      options: mapIdNameToOptions(categoryData?.nodes ?? []),
      isDefault: true,
    },
    {
      type: 'enum',
      name: t('label.type'),
      urlParameter: 'typeId',
      options: mapIdNameToOptions(types),
    },
    {
      type: 'text',
      name: t('label.asset-number'),
      urlParameter: 'assetNumber',
      isDefault: true,
    },
    {
      name: t('label.installation-date'),
      type: 'date',
      urlParameter: 'installationDate',
    },
    {
      type: 'text',
      name: t('label.notes'),
      urlParameter: 'notes',
      placeholder: t('placeholder.search-by-notes'),
    },
    {
      name: t('label.replacement-date'),
      type: 'date',
      urlParameter: 'replacementDate',
    },
    {
      type: 'text',
      name: t('label.serial'),
      urlParameter: 'serialNumber',
      isDefault: true,
    },
  ];

  if (isCentralServer && !isColdChain) {
    filters.push({
      type: 'text',
      name: t('label.store'),
      urlParameter: 'storeCodeOrName',
      isDefault: true,
    });
  }

  return {
    filters,
  };
};

export const Toolbar = () => {
  const { filters } = useToolbar();

  return (
    <AppBarContentPortal
      sx={{
        paddingBottom: '16px',
        flex: 1,
        justifyContent: 'space-between',
        display: 'flex',
        alignItems: 'flex-end',
      }}
    >
      <Box display="flex" gap={1}>
        <FilterMenu filters={filters} />
      </Box>
    </AppBarContentPortal>
  );
};
