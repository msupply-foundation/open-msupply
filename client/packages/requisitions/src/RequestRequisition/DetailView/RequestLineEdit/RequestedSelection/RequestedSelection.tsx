import React, { useMemo } from 'react';
import {
  Autocomplete,
  Box,
  NumericTextInput,
  Typography,
  useIntlUtils,
  useTranslation,
} from '@openmsupply-client/common';
import { getCurrentValue, getUpdatedRequest } from './utils';
import { DraftRequestLine } from '../hooks';
import { Representation, RepresentationValue } from '../utils';

interface Option {
  label: string;
  value: RepresentationValue;
}

interface RequestedSelectionProps {
  disabled?: boolean;
  isPacksEnabled?: boolean;
  defaultPackSize?: number;
  draft?: DraftRequestLine | null;
  update: (patch: Partial<DraftRequestLine>) => void;
  representation: RepresentationValue;
  setRepresentation: (rep: RepresentationValue) => void;
  unitName: string;
}

export const RequestedSelection = ({
  disabled,
  isPacksEnabled,
  defaultPackSize,
  draft,
  update,
  representation,
  setRepresentation,
  unitName,
}: RequestedSelectionProps) => {
  const t = useTranslation();
  const { getPlural } = useIntlUtils();

  const currentValue = useMemo(
    (): number =>
      getCurrentValue(
        representation,
        draft?.requestedQuantity,
        defaultPackSize
      ),
    [representation, draft?.requestedQuantity, defaultPackSize]
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

  const defaultOption =
    options.find(option => option.value === representation) || options[0];

  const handleValueChange = (value?: number) => {
    const updatedRequest = getUpdatedRequest(
      value,
      representation,
      defaultPackSize,
      draft?.suggestedQuantity
    );
    update(updatedRequest);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        text: 'black',
        mb: 1,
      }}
    >
      <Typography variant="body1" fontWeight="bold">
        {t('label.requested')}:
      </Typography>
      <Box gap={1} display="flex" flexDirection="row" alignItems="center">
        <NumericTextInput
          width={150}
          min={0}
          value={currentValue}
          disabled={disabled}
          onChange={handleValueChange}
          slotProps={{
            input: {
              sx: {
                background: theme => theme.palette.background.white,
              },
            },
          }}
          sx={{
            '& .MuiInputBase-input': {
              p: '3px 4px',
              backgroundColor: theme => theme.palette.background.white,
            },
          }}
        />
        <Autocomplete
          fullWidth
          clearable={false}
          options={options}
          value={defaultOption}
          onChange={(_, option) => {
            setRepresentation(option?.value ?? Representation.UNITS);
          }}
          getOptionLabel={option => option.label}
          textSx={{
            borderRadius: 2,
            background: theme => theme.palette.background.white,
          }}
        />
      </Box>
    </Box>
  );
};
