import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  NumericTextInput,
  Select,
  Typography,
  useDebounceCallback,
  useIntlUtils,
  useTranslation,
  Representation,
  RepresentationValue,
} from '@openmsupply-client/common';
import {
  getCurrentValue,
  getUpdatedRequest,
  getDosesFromUnits,
  getUnitsFromDoses,
} from './utils';
import { DraftRequestLine } from '../hooks';

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
  setIsEditingRequested: (isEditingRequested: boolean) => void;
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
  setIsEditingRequested,
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

  // Compute the current dose value from units
  const currentDoseValue = useMemo((): number => {
    const units =
      representation === Representation.PACKS
        ? value * (defaultPackSize ?? 1)
        : value;
    return getDosesFromUnits(units, dosesPerUnit);
  }, [value, representation, defaultPackSize, dosesPerUnit]);

  const [doseValue, setDoseValue] = useState(currentDoseValue);

  useEffect(() => {
    setValue(currentValue);
  }, [draft?.id, representation]);

  // Keep dose value in sync when the unit value changes
  useEffect(() => {
    setDoseValue(currentDoseValue);
  }, [currentDoseValue]);

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
      setIsEditingRequested(false);
    },
    [representation, defaultPackSize, update]
  );

  const handleValueChange = (newValue?: number) => {
    setIsEditingRequested(true);
    setValue(newValue ?? 0);
    debouncedUpdate(newValue);
  };

  const debouncedDoseUpdate = useDebounceCallback(
    (doses?: number) => {
      const units = getUnitsFromDoses(doses ?? 0, dosesPerUnit);
      // Auto-correct: compute consistent dose value from rounded-up units
      const correctedDoses = getDosesFromUnits(units, dosesPerUnit);
      setDoseValue(correctedDoses);

      // Convert units to the current representation for the update
      const valueInRepresentation =
        representation === Representation.PACKS
          ? units / (defaultPackSize ?? 1)
          : units;
      setValue(Math.ceil(valueInRepresentation));

      const updatedRequest = getUpdatedRequest(
        Math.ceil(valueInRepresentation),
        representation,
        defaultPackSize,
        draft?.suggestedQuantity
      );
      update(updatedRequest);
      setIsEditingRequested(false);
    },
    [representation, defaultPackSize, dosesPerUnit, update]
  );

  const handleDoseChange = (newDoseValue?: number) => {
    setIsEditingRequested(true);
    setDoseValue(newDoseValue ?? 0);
    debouncedDoseUpdate(newDoseValue);
  };

  const showDoseInput = displayVaccinesInDoses && dosesPerUnit > 0;

  const inputSx = {
    '& .MuiInputBase-input': {
      p: '3px 4px',
      backgroundColor: (theme: any) =>
        disabled
          ? theme.palette.background.toolbar
          : theme.palette.background.white,
    },
  };

  const inputSlotProps = {
    input: {
      sx: {
        background: (theme: any) =>
          disabled
            ? theme.palette.background.toolbar
            : theme.palette.background.white,
      },
    },
  };

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
            onBlur={() => setIsEditingRequested(false)}
            slotProps={inputSlotProps}
            sx={inputSx}
          />
        </Box>
        <Box flex={1}>
          <Select
            fullWidth
            clearable={false}
            options={options}
            value={representation}
            onChange={e => {
              setRepresentation(e.target.value as RepresentationValue);
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
            disabled={disabled}
          />
        </Box>
      </Box>
      {showDoseInput && (
        <>
          <Box display="flex" flexDirection="row" gap={1} mt={1}>
            <Box display="flex" flexDirection="column" flex={1}>
              <NumericTextInput
                fullWidth
                min={0}
                value={doseValue}
                disabled={disabled}
                onChange={handleDoseChange}
                onBlur={() => setIsEditingRequested(false)}
                slotProps={inputSlotProps}
                sx={inputSx}
              />
            </Box>
            <Box
              flex={1}
              display="flex"
              alignItems="center"
              sx={{ pl: 1 }}
            >
              <Typography variant="body1">
                {t('label.doses').toLowerCase()}
              </Typography>
            </Box>
          </Box>
        </>
      )}
    </Box>
  );
};
