import React from 'react';
import {
  AppBarContentPortal,
  Box,
  InputWithLabelRow,
  BasicTextInput,
  useTranslation,
} from '@openmsupply-client/common';
import { StockMovementFragment } from '../api';
import { getStatusTranslation } from '../utils';

interface ToolbarProps {
  movement: StockMovementFragment;
}

export const Toolbar = ({ movement }: ToolbarProps) => {
  const t = useTranslation();

  return (
    <AppBarContentPortal
      sx={{
        display: 'flex',
        flex: 1,
        marginBottom: 1,
        flexDirection: 'column',
      }}
    >
      <Box display="flex" flexDirection="column" gap={1}>
        <InputWithLabelRow
          label={t('label.number')}
          Input={
            <BasicTextInput
              disabled
              value={String(movement.stockMovementNumber)}
            />
          }
        />
        <InputWithLabelRow
          label={t('label.status')}
          Input={
            <BasicTextInput
              disabled
              value={getStatusTranslation(movement.status, t)}
            />
          }
        />
      </Box>
    </AppBarContentPortal>
  );
};
