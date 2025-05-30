import React, { useMemo, useState } from 'react';
import {
  Box,
  NumericTextInput,
  Select,
  Typography,
  useDebounceCallback,
  useIntlUtils,
  useTranslation,
} from '@openmsupply-client/common';
import { getCurrentValue, getUpdatedRequest } from './utils';
import { DraftRequestLine } from '../hooks';
import { Representation, RepresentationValue } from '../../../../common';

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
  showExtraFields?: boolean;
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
  showExtraFields,
}: RequestedSelectionProps) => {
  const t = useTranslation();
  const { getPlural } = useIntlUtils();
  const width = showExtraFields ? 170 : 250;

  const currentValue = useMemo(
    (): number =>
      getCurrentValue(
        representation,
        draft?.requestedQuantity,
        defaultPackSize
      ),
    [representation, draft?.requestedQuantity, defaultPackSize]
  );
  const [value, setValue] = useState(currentValue);

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

  const debouncedUpdate = useDebounceCallback(
    (value?: number) => {
      const updatedRequest = getUpdatedRequest(
        value,
        representation,
        defaultPackSize,
        draft?.suggestedQuantity
      );
      update(updatedRequest);
    },
    [representation, defaultPackSize, update]
  );

  const handleValueChange = (value?: number) => {
    setValue(value ?? 0);
    debouncedUpdate(value);
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
        {t('label.requested')}:
      </Typography>
      <Box gap={1} display="flex" flexDirection="row">
        <NumericTextInput
          autoFocus
          width={width}
          min={0}
          value={value}
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
            boxShadow: theme => (!disabled ? theme.shadows[2] : 'none'),
            '& .MuiInputBase-input': {
              p: 0.78,
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
            boxShadow: theme => (!disabled ? theme.shadows[2] : 'none'),
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
                p: 1,
              },
            },
          }}
        />
      </Box>
    </Box>
  );
};
