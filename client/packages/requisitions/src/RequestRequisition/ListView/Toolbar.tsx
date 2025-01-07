import React, { FC } from 'react';
import {
  useTranslation,
  AppBarContentPortal,
  FilterController,
  FilterMenu,
  Box,
  RequisitionNodeStatus,
} from '@openmsupply-client/common';

export const Toolbar: FC<{
  filter: FilterController;
}> = () => {
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
              name: t('label.name'),
              urlParameter: 'otherPartyName',
              placeholder: t('placeholder.search-by-name'),
            },
            {
              type: 'enum',
              name: t('label.status'),
              urlParameter: 'status',
              options: [
                { label: t('label.draft'), value: RequisitionNodeStatus.Draft },
                { label: t('label.sent'), value: RequisitionNodeStatus.Sent },
                {
                  label: t('label.finalised'),
                  value: RequisitionNodeStatus.Finalised,
                },
              ],
            },
          ]}
        />
      </Box>
    </AppBarContentPortal>
  );
};
