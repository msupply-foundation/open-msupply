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
  useValueInUnitsOrPacks,
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

  const valueInUnitsOrPacks = useValueInUnitsOrPacks(
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
    valueInUnitsOrPacks,
    endAdornmentOverride
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
    <Box sx={{ marginBottom: 1, px: 1, flex: 1, ...sx }}>
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
                  boxShadow: theme => (!disabled ? theme.shadows[2] : 'none'),
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
  );
};

interface NumericInputOptions {
  onChange?: (value?: number) => void;
  autoFocus?: boolean;
  disabledOverride?: boolean;
  endAdornmentOverride?: string;
  sx?: Record<string, unknown>;
}

export const createNumericInput =
  (
    t: TypedTFunction<LocaleKey>,
    commonProps: {
      defaultPackSize: number;
      representation: RepresentationValue;
      unitName: string;
      disabled: boolean;
    }
  ) =>
  (
    label: LocaleKey,
    value: number | null | undefined,
    options: NumericInputOptions = {}
  ) => {
    const {
      onChange = () => {},
      disabledOverride,
      autoFocus = false,
      endAdornmentOverride,
      sx = {},
    } = options;

    return (
      <NumInputRow
        label={t(label)}
        value={value ?? 0}
        onChange={onChange}
        disabled={disabledOverride ?? commonProps.disabled}
        defaultPackSize={commonProps.defaultPackSize}
        representation={commonProps.representation}
        unitName={commonProps.unitName}
        autoFocus={autoFocus}
        endAdornmentOverride={endAdornmentOverride}
        sx={sx}
      />
    );
  };
