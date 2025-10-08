import React, { useMemo } from 'react';

import {
  Box,
  InputWithLabelRow,
  NumericTextInput,
  NumericTextInputProps,
  NumUtils,
  SxProps,
  Theme,
  Typography,
  useFormatNumber,
  useIntlUtils,
  useMediaQuery,
  useTranslation,
} from '@openmsupply-client/common';
import {
  calculateValueInDoses,
  Representation,
  RepresentationValue,
  useEndAdornment,
  useValueInUnitsOrPacks,
} from 'packages/requisitions/src/common';
import { inputSlotProps, commonLabelProps, createLabelRowSx } from './utils';

export interface NumInputRowProps extends NumericTextInputProps {
  label: string;
  onChange?: (value?: number) => void;
  disabled?: boolean;
  representation?: RepresentationValue;
  defaultPackSize?: number;
  unitName?: string | null;
  endAdornmentOverride?: string;
  sx?: SxProps<Theme>;
  showExtraFields?: boolean;
  displayVaccinesInDoses?: boolean;
  dosesPerUnit?: number;
  overrideDoseDisplay?: boolean;
  disabledOverride?: boolean;
  showEndAdornment?: boolean;
}

export const NumInputRow = ({
  label,
  value,
  onChange,
  disabled = false,
  max,
  decimalLimit,
  representation = 'packs',
  defaultPackSize = 1,
  unitName,
  endAdornmentOverride,
  showEndAdornment,
  sx,
  showExtraFields = false,
  displayVaccinesInDoses = false,
  dosesPerUnit = 1,
  overrideDoseDisplay,
  disabledOverride,
  ...rest
}: NumInputRowProps) => {
  const t = useTranslation();
  const { getPlural } = useIntlUtils();
  const { round } = useFormatNumber();
  const isVerticalScreen = useMediaQuery('(max-width:800px)');

  const valueInUnitsOrPacks = useValueInUnitsOrPacks(
    representation,
    defaultPackSize,
    value
  );
  const roundedValue = NumUtils.round(valueInUnitsOrPacks);

  const endAdornment = useEndAdornment(
    t,
    getPlural,
    unitName || t('label.unit'),
    representation,
    valueInUnitsOrPacks,
    endAdornmentOverride
  );

  const handleChange = (newValue?: number) => {
    if (!onChange || newValue === roundedValue) return;

    const value = newValue === undefined ? 0 : newValue;
    if (representation === Representation.PACKS) {
      onChange(value * defaultPackSize);
    } else {
      onChange(value);
    }
  };

  // doses always rounded to display in whole numbers
  const valueInDoses = useMemo(
    () =>
      displayVaccinesInDoses
        ? round(
            calculateValueInDoses(
              representation,
              defaultPackSize,
              dosesPerUnit,
              valueInUnitsOrPacks
            )
          )
        : undefined,
    [
      displayVaccinesInDoses,
      representation,
      defaultPackSize,
      dosesPerUnit,
      valueInUnitsOrPacks,
    ]
  );

  return (
    <Box sx={{ marginBottom: 1, px: 1, flex: 1, ...sx }}>
      <InputWithLabelRow
        Input={
          <NumericTextInput
            fullWidth
            sx={{
              '& .MuiInputBase-input': {
                backgroundColor: theme =>
                  disabled
                    ? theme.palette.background.toolbar
                    : theme.palette.background.white,
              },
            }}
            slotProps={inputSlotProps(disabled)}
            min={0}
            value={roundedValue}
            onChange={handleChange}
            disabled={disabledOverride || disabled}
            max={max}
            decimalLimit={decimalLimit ?? 0}
            endAdornment={showEndAdornment ? endAdornment : ''}
            {...rest}
          />
        }
        label={label}
        labelProps={commonLabelProps(showExtraFields)}
        sx={createLabelRowSx(isVerticalScreen)}
      />
      {/* make this a var */}
      {displayVaccinesInDoses &&
        !!valueInUnitsOrPacks &&
        !overrideDoseDisplay && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              display: 'flex',
              justifyContent: 'flex-end',
              pt: 0.3,
              pr: 1.3,
            }}
          >
            {valueInDoses} {t('label.doses').toLowerCase()}
          </Typography>
        )}
    </Box>
  );
};
