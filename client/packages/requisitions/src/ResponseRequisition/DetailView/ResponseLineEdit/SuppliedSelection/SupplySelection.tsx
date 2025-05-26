import React, { useMemo } from 'react';
import {
  Box,
  NumericTextInput,
  Select,
  Typography,
  useIntlUtils,
  useTranslation,
} from '@openmsupply-client/common';
import { getCurrentValue, getUpdatedSupply } from './utils';
import { Representation, RepresentationValue } from '../../../../common';
import { DraftResponseLine } from '../hooks';

interface Option {
  label: string;
  value: RepresentationValue;
}

interface SupplySelectionProps {
  disabled?: boolean;
  isPacksEnabled?: boolean;
  defaultPackSize?: number;
  draft?: DraftResponseLine | null;
  update: (patch: Partial<DraftResponseLine>) => void;
  representation: RepresentationValue;
  setRepresentation: (rep: RepresentationValue) => void;
  unitName: string;
}

export const SupplySelection = ({
  disabled,
  isPacksEnabled,
  defaultPackSize,
  draft,
  update,
  representation,
  setRepresentation,
  unitName,
}: SupplySelectionProps) => {
  const t = useTranslation();
  const { getPlural } = useIntlUtils();

  const currentValue = useMemo(
    (): number =>
      getCurrentValue(representation, draft?.supplyQuantity, defaultPackSize),
    [representation, draft?.supplyQuantity, defaultPackSize]
  );

  const options = useMemo((): Option[] => {
    const unitPlural = getPlural(unitName, currentValue);
    const packPlural = getPlural(t('label.pack'), currentValue).toLowerCase();

    if (!isPacksEnabled)
      return [{ label: unitName, value: Representation.UNITS }];
    return [
      { label: unitPlural, value: Representation.UNITS },
      { label: packPlural, value: Representation.PACKS },
    ];
  }, [isPacksEnabled, unitName, currentValue]);

  const handleValueChange = (value?: number) => {
    const updatedRequest = getUpdatedSupply(
      value,
      representation,
      defaultPackSize
    );
    update(updatedRequest);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        mb: 1,
      }}
    >
      <Typography variant="body1" fontWeight="bold">
        {t('label.supply')}:
      </Typography>
      <Box gap={1} display="flex" flexDirection="row">
        <NumericTextInput
          width={150}
          min={0}
          value={currentValue}
          disabled={disabled}
          onChange={handleValueChange}
          slotProps={{
            input: {
              sx: {
                background: theme =>
                  disabled
                    ? theme.palette.background.toolbar
                    : theme.palette.background.white,
              },
            },
          }}
          sx={{
            '& .MuiInputBase-input': {
              p: '3px 4px',
              backgroundColor: theme =>
                disabled
                  ? theme.palette.background.toolbar
                  : theme.palette.background.white,
            },
          }}
        />
        <Select
          fullWidth
          clearable={false}
          options={options}
          value={representation}
          onChange={e => {
            setRepresentation(
              (e.target.value as RepresentationValue) ?? Representation.UNITS
            );
          }}
          sx={{
            '& .MuiInputBase-input': {
              p: '3px 4px',
              backgroundColor: theme => theme.palette.background.white,
            },
          }}
          slotProps={{
            input: {
              disableUnderline: true,
              sx: {
                backgroundColor: theme => theme.palette.background.white,
                borderRadius: 2,
              },
            },
          }}
        />
      </Box>
    </Box>
  );
};
