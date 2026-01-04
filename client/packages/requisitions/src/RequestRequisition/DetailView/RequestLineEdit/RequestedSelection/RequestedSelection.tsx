import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  DosesCaption,
  NumericTextInput,
  Select,
  Typography,
  useDebounceCallback,
  useIntlUtils,
  useTranslation,
  Representation,
  RepresentationValue,
} from '@openmsupply-client/common';
import { getCurrentValue, getUpdatedRequest } from './utils';
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
      setIsEditingRequested(false);
    },
    [representation, defaultPackSize, update]
  );

  const handleValueChange = (newValue?: number) => {
    setIsEditingRequested(true);
    setValue(newValue ?? 0);
    debouncedUpdate(newValue);
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
          {displayVaccinesInDoses && !!value && (
            <DosesCaption
              value={value}
              representation={representation}
              dosesPerUnit={dosesPerUnit}
              displayVaccinesInDoses={displayVaccinesInDoses}
            />
          )}
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
    </Box>
  );
};
