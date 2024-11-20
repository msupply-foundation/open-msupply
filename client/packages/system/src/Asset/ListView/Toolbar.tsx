import React, { useEffect, useState } from 'react';
import {
  AppBarContentPortal,
  Box,
  DeleteIcon,
  DropdownMenu,
  DropdownMenuItem,
  FilterMenu,
  useIsCentralServerApi,
  useTranslation,
  useUrlQuery,
} from '@openmsupply-client/common';
import { useAssetData } from '../api/hooks';
import { mapIdNameToOptions } from '../utils';

type ReferenceData = {
  id: string;
  name: string;
  categoryId?: string;
};

export const Toolbar = () => {
  // const { data: classes } = useAssetData.utils.classes();
  const isCentralServer = useIsCentralServerApi();

  const { data: categoryData } = useAssetData.utils.categories();
  const { data: typeData } = useAssetData.utils.types();
  const { urlQuery, updateQuery } = useUrlQuery({
    skipParse: ['classId', 'categoryId', 'typeId'],
  });
  const t = useTranslation();
  const [categories, setCategories] = useState<ReferenceData[]>([]);
  const [types, setTypes] = useState<ReferenceData[]>([]);
  const onDelete = useAssetData.document.delete();

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
            },
            // {
            //   type: 'enum',
            //   name: t('label.class'),
            //   urlParameter: 'classId',
            //   options: mapIdNameToOptions(classes?.nodes || []),
            // },
            {
              type: 'text',
              name: t('label.code'),
              urlParameter: 'code',
            },
            {
              type: 'text',
              name: t('label.manufacturer'),
              urlParameter: 'manufacturer',
              placeholder: t('placeholder.search-by-location-name'),
            },
            {
              type: 'text',
              name: t('label.model'),
              urlParameter: 'model',
              placeholder: t('placeholder.search-by-location-name'),
            },
            {
              type: 'text',
              name: t('label.sub-catalogue'),
              urlParameter: 'subCatalogue',
              placeholder: t('placeholder.search-by', {
                field: t('label.sub-catalogue'),
              }),
            },
            {
              type: 'enum',
              name: t('label.type'),
              urlParameter: 'typeId',
              options: mapIdNameToOptions(types),
            },
          ]}
        />
      </Box>
      {isCentralServer && (
        <DropdownMenu label={t('label.actions')}>
          <DropdownMenuItem IconComponent={DeleteIcon} onClick={onDelete}>
            {t('button.delete-lines')}
          </DropdownMenuItem>
        </DropdownMenu>
      )}
    </AppBarContentPortal>
  );
};
