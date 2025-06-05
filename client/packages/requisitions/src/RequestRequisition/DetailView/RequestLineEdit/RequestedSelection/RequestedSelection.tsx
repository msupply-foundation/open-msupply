import React, { useEffect, useMemo, useState } from 'react';
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
import {
  calculateValueInDoses,
  Representation,
  RepresentationValue,
} from '../../../../common';

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
  displayVaccinesInDoses?: boolean;
  dosesPerUnit?: number;
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
  displayVaccinesInDoses = false,
  dosesPerUnit = 1,
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
  const [value, setValue] = useState(currentValue);

  useEffect(() => {
    setValue(currentValue);
  }, [draft?.id, representation]);

  const options = useMemo((): Option[] => {
    const displayValue = value === 1 ? 1 : 2;
    const unitPlural = getPlural(unitName.toLowerCase(), displayValue);
    const packPlural = getPlural(t('label.pack'), displayValue).toLowerCase();

    if (!isPacksEnabled)
      return [{ label: unitName, value: Representation.UNITS }];
    return [
      { label: unitPlural, value: Representation.UNITS },
      { label: packPlural, value: Representation.PACKS },
    ];
  }, [unitName, currentValue, isPacksEnabled]);

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

  const handleValueChange = (newValue?: number) => {
    setValue(newValue ?? 0);
    debouncedUpdate(newValue);
  };

  const valueInDoses = useMemo(() => {
    if (!displayVaccinesInDoses) return undefined;
    return calculateValueInDoses(
      representation,
      defaultPackSize || 1,
      dosesPerUnit,
      value
    );
  }, [
    displayVaccinesInDoses,
    representation,
    defaultPackSize,
    dosesPerUnit,
    value,
  ]);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Typography variant="body1" fontWeight="bold" pt={0.5} pb={0.5}>
        {t('label.requested')}:
      </Typography>
      <Box display="flex" flexDirection="row" gap={1}>
        <Box display="flex" flexDirection="column" flex={1}>
          <NumericTextInput
            autoFocus
            fullWidth
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
              '& .MuiInputBase-input': {
                p: '3px 4px',
                backgroundColor: theme =>
                  disabled
                    ? theme.palette.background.toolbar
                    : theme.palette.background.white,
              },
            }}
          />
          {displayVaccinesInDoses && (
            <Typography
              variant="caption"
              color="text.secondary"
              pt={0.3}
              pr={1.5}
              sx={{ textAlign: 'right' }}
            >
              {valueInDoses} {t('label.doses').toLowerCase()}
            </Typography>
          )}
        </Box>
        <Box flex={1}>
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
    </Box>
  );
};
