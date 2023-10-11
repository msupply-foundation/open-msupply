import React, { FC } from 'react';
import {
  useTranslation,
  AppBarContentPortal,
  FilterRoot,
  FilterController,
  Box,
} from '@openmsupply-client/common';

export const Toolbar: FC<{ filter: FilterController }> = () => {
  const t = useTranslation('dispensary');

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
        <FilterRoot
          filters={[
            {
              type: 'text',
              name: t('label.search-first-name'),
              urlParameter: 'firstName',
              placeholder: t('placeholder.search-by-first-name'),
            },
            {
              type: 'text',
              name: t('label.search-last-name'),
              urlParameter: 'lastName',
              placeholder: t('placeholder.search-by-last-name'),
            },
            {
              type: 'text',
              name: t('label.search-identifier'),
              urlParameter: 'identifier',
              placeholder: t('placeholder.search-by-identifier'),
            },
            // {
            //   type: 'enum',
            //   name: 'Gender',
            //   urlParameter: 'gender',
            //   options: [
            //     { label: 'Male', value: 'MALE' },
            //     { label: 'Female', value: 'FEMALE' },
            //   ],
            // },
          ]}
        />
      </Box>
    </AppBarContentPortal>
  );
};
