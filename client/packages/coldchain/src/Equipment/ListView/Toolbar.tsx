import React, { useEffect, useState } from 'react';
import {
  AppBarContentPortal,
  Box,
  DeleteIcon,
  DropdownMenu,
  DropdownMenuItem,
  FilterMenu,
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
  const t = useTranslation('catalogue');
  const { urlQuery, updateQuery } = useUrlQuery({
    skipParse: ['classId', 'categoryId', 'typeId'],
  });
  const [categories, setCategories] = useState<ReferenceData[]>([]);
  const [types, setTypes] = useState<ReferenceData[]>([]);
  const onDelete = useAssets.document.deleteAssets();

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
        <FilterMenu
          filters={[
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
              isDefault: true,
            },
            {
              type: 'text',
              name: t('label.code'),
              urlParameter: 'code',
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
            },
          ]}
        />
      </Box>
      <DropdownMenu label={t('label.actions')}>
        <DropdownMenuItem IconComponent={DeleteIcon} onClick={onDelete}>
          {t('button.delete-lines')}
        </DropdownMenuItem>
      </DropdownMenu>
    </AppBarContentPortal>
  );
};
