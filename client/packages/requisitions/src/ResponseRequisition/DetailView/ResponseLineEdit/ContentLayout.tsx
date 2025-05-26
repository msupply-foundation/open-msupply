import React from 'react';
import {
  Box,
  NumUtils,
  useIntlUtils,
  useTranslation,
  SxProps,
  Theme,
  InputWithLabelRow,
  NumericTextInput,
  TypedTFunction,
  LocaleKey,
} from '@openmsupply-client/common';
import {
  useEndAdornment,
  getValueInUnitsOrPacks,
  Representation,
  RepresentationValue,
} from '../../../common';

export interface NumInputRowProps {
  label: string;
  value: number;
  onChange?: (value?: number) => void;
  disabled: boolean;
  autoFocus?: boolean;
  representation: RepresentationValue;
  defaultPackSize: number;
  unitName: string;
  endAdornmentOverride?: string;
  sx?: SxProps<Theme>;
}

export const NumInputRow = ({
  label,
  value,
  onChange,
  disabled,
  autoFocus = false,
  representation,
  defaultPackSize,
  unitName,
  endAdornmentOverride,
  sx,
}: NumInputRowProps) => {
  const t = useTranslation();
  const { getPlural } = useIntlUtils();

  const valueInUnitsOrPacks = getValueInUnitsOrPacks(
    representation,
    defaultPackSize,
    value
  );
  const roundedValue = NumUtils.round(valueInUnitsOrPacks, 2);

  const endAdornment = useEndAdornment(
    t,
    getPlural,
    unitName,
    representation,
    endAdornmentOverride,
    valueInUnitsOrPacks
  );

  const handleChange = (newValue?: number) => {
    if (!onChange || newValue === roundedValue) return;
    if (representation === Representation.PACKS && newValue !== undefined) {
      onChange(newValue * defaultPackSize);
    } else {
      onChange(newValue);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 1,
        px: 1,
        ...sx,
      }}
    >
      <Box sx={{ flex: 1 }}>
        <InputWithLabelRow
          Input={
            <NumericTextInput
              sx={{
                '& .MuiInputBase-input': {
                  p: '3px 4px',
                  backgroundColor: theme =>
                    disabled
                      ? theme.palette.background.toolbar
                      : theme.palette.background.white,
                },
              }}
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
              min={0}
              width={145}
              value={roundedValue}
              onChange={handleChange}
              disabled={disabled}
              autoFocus={autoFocus}
              decimalLimit={0}
              endAdornment={endAdornment}
            />
          }
          label={label}
          sx={{
            justifyContent: 'space-between',
          }}
        />
      </Box>
    </Box>
  );
};
