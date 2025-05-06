import React, { ReactElement, useMemo, useState } from 'react';
import {
  Autocomplete,
  Box,
  NumericTextInput,
  Typography,
  useTranslation,
} from '@openmsupply-client/common';

import { DraftRequestLine } from '../../hooks';
import {
  getCurrentValue,
  getQuantity,
  getUpdatedRequest,
  ItemType,
} from './utils';

interface Option {
  label: string;
  value: ItemType;
}

interface OrderProps {
  disabled?: boolean;
  isPacksEnabled?: boolean;
  draft?: DraftRequestLine | null;
  update: (patch: Partial<DraftRequestLine>) => void;
}

export const Order = ({
  disabled,
  isPacksEnabled,
  draft,
  update,
}: OrderProps): ReactElement => {
  const t = useTranslation();
  const [itemType, setItemType] = useState<ItemType>('units');

  const options = useMemo((): Option[] => {
    if (!isPacksEnabled) return [{ label: t('label.units'), value: 'units' }];
    return [
      { label: t('label.units'), value: 'units' },
      { label: t('label.packs'), value: 'packs' },
    ];
  }, [isPacksEnabled, t]);

  const defaultOption = options.find(option => option.value === itemType);

  const alternativeQuantityLabel = useMemo((): string => {
    const quantity = getQuantity(
      itemType,
      draft?.requestedQuantity,
      draft?.defaultPackSize
    );
    return itemType === 'packs'
      ? t('label.order-count-units', { count: quantity })
      : t('label.order-count-packs', { count: quantity });
  }, [itemType, draft?.requestedQuantity, draft?.defaultPackSize, t]);

  const currentValue = useMemo(
    (): number =>
      getCurrentValue(
        itemType,
        draft?.requestedQuantity,
        draft?.defaultPackSize
      ),
    [itemType, draft?.requestedQuantity, draft?.defaultPackSize]
  );

  const handleValueChange = (value?: number) => {
    const updatedRequest = getUpdatedRequest(
      value,
      itemType,
      draft?.defaultPackSize,
      draft?.suggestedQuantity
    );
    update(updatedRequest);
  };

  const unitDescription =
    itemType === 'units'
      ? t('label.in-unit-name', {
          unitName: draft?.unitName,
          count: currentValue,
        })
      : t('label.of-unit-name', {
          unitName: draft?.unitName,
          count: draft?.defaultPackSize,
        });

  return (
    <Box
      sx={{
        mt: -3,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box gap={1} display="flex" flexDirection="row" alignItems="center">
        <NumericTextInput
          width={150}
          value={currentValue}
          disabled={disabled}
          onChange={handleValueChange}
          sx={{
            '& .MuiInputBase-input': {
              p: '3px 4px',
              backgroundColor: theme => theme.palette.background.white,
            },
          }}
        />
        <Autocomplete
          width="150px"
          clearable={false}
          options={options}
          value={defaultOption}
          onChange={(_, option) => {
            setItemType(option?.value ?? 'units');
          }}
          getOptionLabel={option => option.label}
          textSx={{ borderRadius: 2 }}
        />
        <Typography>{unitDescription}</Typography>
      </Box>
      {isPacksEnabled && (
        <Typography pl={1} variant="body2" color="text.secondary">
          {alternativeQuantityLabel}
        </Typography>
      )}
    </Box>
  );
};
