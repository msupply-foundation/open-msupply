import React, { useEffect, useState } from 'react';
import {
  AppBarContentPortal,
  Box,
  FilterMenu,
  useTranslation,
  useUrlQuery,
} from '@openmsupply-client/common';
import { useAssets } from '../api/hooks';

type ReferenceData = {
  id: string;
  name: string;
  categoryId?: string;
};

export const Toolbar = () => {
  // const { data: classes } = useAssets.utils.classes();
  const { data: categoryData } = useAssets.utils.categories();
  const { data: typeData } = useAssets.utils.types();
  const { urlQuery, updateQuery } = useUrlQuery({
    skipParse: ['classId', 'categoryId', 'typeId'],
  });
  const t = useTranslation('catalogue');
  const [categories, setCategories] = useState<ReferenceData[]>([]);
  const [types, setTypes] = useState<ReferenceData[]>([]);

  const categoryId = urlQuery['categoryId'];
  const typeId = urlQuery['typeId'];
  const mapOptions = (items: { id: string; name: string }[]) =>
    items.map(item => ({
      label: item.name,
      value: item.id,
    }));

  useEffect(() => {
    const newTypes = (typeData?.nodes || []).filter(
      type => !categoryId || type.categoryId === categoryId
    );
    setTypes(newTypes);

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
              options: mapOptions(categories),
            },
            // {
            //   type: 'enum',
            //   name: t('label.class'),
            //   urlParameter: 'classId',
            //   options: mapOptions(classes?.nodes || []),
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
              type: 'enum',
              name: t('label.type'),
              urlParameter: 'typeId',
              options: mapOptions(types),
            },
          ]}
        />
      </Box>
    </AppBarContentPortal>
  );
};
