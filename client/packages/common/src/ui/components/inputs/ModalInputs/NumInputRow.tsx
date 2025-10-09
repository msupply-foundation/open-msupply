import React from 'react';

import {
  Box,
  InputWithLabelRow,
  NumericTextInput,
  NumericTextInputProps,
  NumUtils,
  SxProps,
  Theme,
  useMediaQuery,
  DosesCaption,
  Representation,
  RepresentationValue,
} from '@openmsupply-client/common';
import { inputSlotProps, commonLabelProps, createLabelRowSx } from './utils';

export interface NumInputRowProps extends NumericTextInputProps {
  label: string;
  onChange?: (value?: number) => void;
  disabled?: boolean;
  representation?: RepresentationValue;
  defaultPackSize?: number;
  endAdornment?: string;
  sx?: SxProps<Theme>;
  showExtraFields?: boolean;
  displayVaccinesInDoses?: boolean;
  overrideDoseDisplay?: boolean;
  disabledOverride?: boolean;
  dosesPerUnit?: number;
  value: number | undefined;
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
  dosesPerUnit = 1,
  endAdornment,
  sx,
  showExtraFields = false,
  displayVaccinesInDoses = false,
  overrideDoseDisplay,
  disabledOverride,
  ...rest
}: NumInputRowProps) => {
  const isVerticalScreen = useMediaQuery('(max-width:800px)');

  const roundedValue = value ? NumUtils.round(value) : 0;

  const showDoseLabel =
    displayVaccinesInDoses && !!value && !overrideDoseDisplay;

  const handleChange = (newValue?: number) => {
    if (!onChange || newValue === roundedValue) return;

    const value = newValue === undefined ? 0 : newValue;
    if (representation === Representation.PACKS) {
      onChange(value * defaultPackSize);
    } else {
      onChange(value);
    }
  };

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
            endAdornment={endAdornment}
            {...rest}
          />
        }
        label={label}
        labelProps={commonLabelProps(showExtraFields)}
        sx={createLabelRowSx(isVerticalScreen)}
      />
      {showDoseLabel && (
        <DosesCaption
          value={value}
          representation={representation}
          dosesPerUnit={dosesPerUnit}
          displayVaccinesInDoses={displayVaccinesInDoses}
        />
      )}
    </Box>
  );
};
