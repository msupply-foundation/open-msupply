import React, { useEffect, useState } from 'react';
import {
  AppBarContentPortal,
  AssetLogStatusInput,
  Box,
  DeleteIcon,
  DropdownMenu,
  DropdownMenuItem,
  FilterDefinition,
  FilterMenu,
  useIsCentralServerApi,
  useTranslation,
  useUrlQuery,
} from '@openmsupply-client/common';
import { mapIdNameToOptions, useAssetData } from '@openmsupply-client/system';
import { CCE_CLASS_ID } from '../utils';
import { useAssets } from '../api';

type ReferenceData = {
  id: string;
  name: string;
  categoryId?: string;
};

export const Toolbar = () => {
  const { data: categoryData } = useAssetData.utils.categories({
    classId: { equalTo: CCE_CLASS_ID },
  });
  const { data: typeData } = useAssetData.utils.types();
  const t = useTranslation(['catalogue', 'coldchain']);
  const { urlQuery, updateQuery } = useUrlQuery({
    skipParse: ['classId', 'categoryId', 'typeId'],
  });
  const [categories, setCategories] = useState<ReferenceData[]>([]);
  const [types, setTypes] = useState<ReferenceData[]>([]);

  const onDelete = useAssets.document.deleteAssets();
  const isCentralServer = useIsCentralServerApi();

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

  useEffect(() => setCategories(categoryData?.nodes || []), [categoryData]);

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
          label: t('status.decommissioned', { ns: 'coldchain' }),
          value: AssetLogStatusInput.Decommissioned,
        },
        {
          label: t('status.functioning', { ns: 'coldchain' }),
          value: AssetLogStatusInput.Functioning,
        },
        {
          label: t('status.functioning-but-needs-attention', {
            ns: 'coldchain',
          }),
          value: AssetLogStatusInput.FunctioningButNeedsAttention,
        },
        {
          label: t('status.not-functioning', { ns: 'coldchain' }),
          value: AssetLogStatusInput.NotFunctioning,
        },
        {
          label: t('status.not-in-use', { ns: 'coldchain' }),
          value: AssetLogStatusInput.NotInUse,
        },
      ],
      isDefault: true,
    },
    {
      type: 'enum',
      name: t('label.category'),
      urlParameter: 'categoryId',
      options: mapIdNameToOptions(categories),
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

  if (isCentralServer)
    filters.push({
      type: 'text',
      name: t('label.store'),
      urlParameter: 'store',
      isDefault: true,
    });

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
      <DropdownMenu label={t('label.actions')}>
        <DropdownMenuItem IconComponent={DeleteIcon} onClick={onDelete}>
          {t('button.delete-lines')}
        </DropdownMenuItem>
      </DropdownMenu>
    </AppBarContentPortal>
  );
};
