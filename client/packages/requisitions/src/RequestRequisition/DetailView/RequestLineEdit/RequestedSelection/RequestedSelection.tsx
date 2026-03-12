import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  DosesOrUnitsCaption,
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
  unitsToRepresentation,
  getUpdatedRequest,
  representationToUnits,
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
  isDosesEnabled?: boolean;
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
  isDosesEnabled = false,
  dosesPerUnit = 1,
  setIsEditingRequested,
}: RequestedSelectionProps) => {
  const t = useTranslation();
  const { getPlural } = useIntlUtils();

  const currentValue = useMemo(
    (): number =>
      unitsToRepresentation(
        draft?.requestedQuantity ?? 0,
        representation,
        defaultPackSize,
        dosesPerUnit
      ),
    [representation, draft?.requestedQuantity, defaultPackSize, dosesPerUnit]
  );

  const [value, setValue] = useState(currentValue);

  useEffect(() => {
    setValue(currentValue);
  }, [draft?.id, representation]);

  const options = useMemo((): Option[] => {
    const displayValue = value === 1 ? 1 : 2;
    const unitPlural = getPlural(unitName.toLowerCase(), displayValue);
    const packPlural = getPlural(t('label.pack'), displayValue).toLowerCase();
    const dosePlural = getPlural(t('label.dose').toLowerCase(), displayValue);

    const opts: Option[] = [{ label: unitPlural, value: Representation.UNITS }];

    if (isPacksEnabled)
      opts.push({ label: packPlural, value: Representation.PACKS });

    if (isDosesEnabled && dosesPerUnit > 0) {
      opts.push({ label: dosePlural, value: Representation.DOSES });
    }

    return opts;
  }, [unitName, currentValue, isPacksEnabled, isDosesEnabled, dosesPerUnit]);

  const debouncedUpdate = useDebounceCallback(
    (value?: number) => {
      const updatedRequest = getUpdatedRequest(
        value,
        representation,
        defaultPackSize,
        draft?.suggestedQuantity,
        dosesPerUnit
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
          {isDosesEnabled && !!value && (
            <DosesOrUnitsCaption
              value={representationToUnits(
                value,
                representation,
                defaultPackSize,
                dosesPerUnit
              )}
              dosesPerUnit={dosesPerUnit}
              dosesSelected={representation === Representation.DOSES}
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
