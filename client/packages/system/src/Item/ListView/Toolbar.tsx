import React, { FC } from 'react';
import {
  AppBarContentPortal,
  useTranslation,
  FilterMenu,
  Box,
} from '@openmsupply-client/common';
import { hasStockOnHandInput } from '../api';

export const Toolbar: FC = () => {
  const t = useTranslation();
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
              type: 'text',
              name: t('label.code-or-name'),
              urlParameter: 'codeOrName',
              placeholder: t('placeholder.enter-an-item-code-or-name'),
              isDefault: true,
            },
            {
              type: 'enum',
              name: t('label.in-stock'),
              urlParameter: 'hasStockOnHand',
              options: [
                {
                  label: t('label.in-stock'),
                  value: hasStockOnHandInput.True,
                },
                {
                  label: t('label.out-of-stock'),
                  value: hasStockOnHandInput.False,
                },
              ],
            },
            {
              type: 'number',
              name: t('label.more-than-months-stock'),
              urlParameter: 'moreThanMonthsOfStock',
              minValue: 0,
              decimalLimit: 0,
            },
            {
              type: 'number',
              name: t('label.less-than-months-stock'),
              urlParameter: 'lessThanMonthsOfStock',
              minValue: 0,
              decimalLimit: 0,
            },
          ]}
        />
      </Box>
    </AppBarContentPortal>
  );
};
