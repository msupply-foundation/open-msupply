import React, { FC } from 'react';
import {
  AppBarContentPortal,
  useTranslation,
  FilterMenu,
  Box,
  usePreferences,
} from '@openmsupply-client/common';

export const Toolbar: FC = () => {
  const t = useTranslation();
  const {
    numberOfMonthsToCheckForConsumptionWhenCalculatingOutOfStockProducts:
      numMonthsConsumption,
  } = usePreferences();

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
                  value: 'true', // string value will be parsed as boolean from URL query params
                },
                {
                  label: t('label.out-of-stock'),
                  value: 'false',
                },
              ],
            },
            {
              type: 'number',
              name: t('label.min-mos'),
              urlParameter: 'minMonthsOfStock',
              minValue: 0,
              decimalLimit: 0,
            },
            {
              type: 'number',
              name: t('label.max-mos'),
              urlParameter: 'maxMonthsOfStock',
              minValue: 0,
              decimalLimit: 0,
            },
            ...(numMonthsConsumption
              ? [
                  {
                    type: 'enum' as const,
                    name: t('label.out-of-stock-products'),
                    urlParameter: 'outOfStockProducts',
                    options: [
                      {
                        label: t('label.show-out-of-stock-products'),
                        value: 'true',
                      },
                      {
                        label: t('label.show-in-stock-products'),
                        value: 'false',
                      },
                    ],
                  },
                  {
                    type: 'enum' as const,
                    name: t('label.products-at-risk-of-being-out-of-stock'),
                    urlParameter: 'productsAtRiskOfBeingOutOfStock',
                    options: [
                      {
                        label: t('label.show-products-at-risk'),
                        value: 'true',
                      },
                      {
                        label: t('label.show-products-not-at-risk'),
                        value: 'false',
                      },
                    ],
                  },
                ]
              : []),
          ]}
        />
      </Box>
    </AppBarContentPortal>
  );
};
