import React, { FC } from 'react';
import {
  AppBarContentPortal,
  FilterController,
  FilterMenu,
  Box,
  useTranslation,
  RequisitionNodeStatus,
} from '@openmsupply-client/common';

export const Toolbar: FC<{
  filter: FilterController;
}> = () => {
  const t = useTranslation('distribution');

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
              name: t('label.name'),
              urlParameter: 'otherPartyName',
              placeholder: t('placeholder.search-by-name'),
            },
            {
              type: 'enum',
              name: t('label.status'),
              urlParameter: 'status',
              options: [
                { label: t('label.new'), value: RequisitionNodeStatus.New },
                {
                  label: t('label.finalised'),
                  value: RequisitionNodeStatus.Finalised,
                },
              ],
            },
            {
              type: 'boolean',
              name: t('label.shipment-created'),
              urlParameter: 'aShipmentHasBeenCreated',
            },
          ]}
        />
      </Box>
    </AppBarContentPortal>
  );
};
