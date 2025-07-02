import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  NumericTextInput,
  Select,
  Typography,
  useDebounceCallback,
  useFormatNumber,
  useIntlUtils,
  useTranslation,
} from '@openmsupply-client/common';
import { getCurrentValue, getUpdatedSupply } from './utils';
import {
  calculateValueInDoses,
  Representation,
  RepresentationValue,
} from '../../../../common';
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
  displayVaccinesInDoses?: boolean;
  dosesPerUnit: number;
  setIsEditingSupply: (isEditingSupply: boolean) => void;
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
  displayVaccinesInDoses = false,
  dosesPerUnit,
  setIsEditingSupply,
}: SupplySelectionProps) => {
  const t = useTranslation();
  const { getPlural } = useIntlUtils();
  const { round } = useFormatNumber();

  const currentValue = useMemo(
    (): number =>
      getCurrentValue(representation, draft?.supplyQuantity, defaultPackSize),
    [representation, draft?.supplyQuantity, defaultPackSize]
  );
  const [value, setValue] = useState(currentValue);

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
  }, [isPacksEnabled, unitName, currentValue]);

  const debouncedUpdate = useDebounceCallback(
    (value?: number) => {
      const updatedSupply = getUpdatedSupply(
        value,
        representation,
        defaultPackSize
      );
      update(updatedSupply);
      setIsEditingSupply(false);
    },
    [representation, defaultPackSize]
  );

  useEffect(() => {
    setValue(currentValue);
  }, [draft?.id, representation]);

  const handleValueChange = (newValue?: number) => {
    setIsEditingSupply(true);
    setValue(newValue ?? 0);
    debouncedUpdate(newValue);
  };

  const valueInDoses = useMemo(() => {
    if (!displayVaccinesInDoses) return undefined;
    return round(
      calculateValueInDoses(
        representation,
        defaultPackSize || 1,
        dosesPerUnit,
        value
      ),
      2
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
        pb: 1,
      }}
    >
      <Typography variant="body1" fontWeight="bold" pt={0.5} pb={0.5}>
        {t('label.supply')}:
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
            onBlur={() => setIsEditingSupply(false)}
            slotProps={{
              input: {
                sx: {
                  boxShadow: theme => (!disabled ? theme.shadows[2] : 'none'),
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
            <Typography
              variant="caption"
              color="text.secondary"
              pt={0.3}
              pr={1.2}
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
                },
              },
            }}
          />
        </Box>
      </Box>
    </Box>
  );
};
