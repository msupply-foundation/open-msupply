import React, { Dispatch, SetStateAction } from 'react';
import { FormControlLabel } from '@mui/material';
import { RadioGroup, Radio, useTranslation } from '@openmsupply-client/common';
import { CreateStocktakeModalState } from './types';

export const FullStocktakeOnHandSelector = ({
  includeAllItems,
  setState,
}: {
  includeAllItems: boolean;
  setState: Dispatch<SetStateAction<CreateStocktakeModalState>>;
}) => {
  const t = useTranslation();
  return (
    <RadioGroup
      value={includeAllItems}
      sx={{
        transform: 'scale(0.95)',
        padding: 1,
      }}
      onChange={(_, value) => {
        setState(prev => ({
          ...prev,
          includeAllItems: value === 'true',
        }));
      }}
    >
      <FormControlLabel
        data-testid="stocktake-items-with-soh"
        value={false}
        control={<Radio sx={{ padding: '4px' }} />}
        label={t('stocktake.items-with-soh')}
      />
      <FormControlLabel
        data-testid="stocktake-all-items"
        value={true}
        control={<Radio sx={{ padding: '4px' }} />}
        label={t('stocktake.all-master-list-items')}
      />
    </RadioGroup>
  );
};
