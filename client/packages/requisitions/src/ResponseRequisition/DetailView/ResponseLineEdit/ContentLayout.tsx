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
  Typography,
  useMediaQuery,
  useFormatNumber,
} from '@openmsupply-client/common';
import {
  useEndAdornment,
  useValueInUnitsOrPacks,
  Representation,
  RepresentationValue,
  calculateValueInDoses,
} from '../../../common';

export interface NumInputRowProps {
  label: string;
  value: number;
  onChange?: (value?: number) => void;
  disabled: boolean;
  representation: RepresentationValue;
  defaultPackSize: number;
  unitName: string;
  endAdornmentOverride?: string;
  sx?: SxProps<Theme>;
  showExtraFields?: boolean;
  displayVaccinesInDoses?: boolean;
  dosesPerUnit: number;
}

export const NumInputRow = ({
  label,
  value,
  onChange,
  disabled,
  representation,
  defaultPackSize,
  unitName,
  endAdornmentOverride,
  sx,
  showExtraFields = false,
  displayVaccinesInDoses = false,
  dosesPerUnit,
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

    const value = newValue === undefined ? 0 : newValue;
    if (representation === Representation.PACKS) {
      onChange(value * defaultPackSize);
    } else {
      onChange(value);
    }
  };

  const valueInDoses = React.useMemo(
    () =>
      displayVaccinesInDoses
        ? round(
            calculateValueInDoses(
              representation,
              defaultPackSize,
              dosesPerUnit,
              valueInUnitsOrPacks
            ),
            2
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
    <Box
      sx={{
        marginBottom: 1,
        px: 1,
        flex: 1,
        ...sx,
      }}
    >
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
            value={roundedValue}
            onChange={handleChange}
            disabled={disabled}
            decimalLimit={0}
            endAdornment={endAdornment}
          />
        }
        label={label}
        labelProps={{
          sx: {
            width: {
              xs: '100%',
              md: showExtraFields ? '400px' : '600px',
              lg: showExtraFields ? '370px' : '550px',
            },
          },
        }}
        sx={{
          justifyContent: 'space-between',
          flexDirection: {
            xs: isVerticalScreen ? 'column' : 'row',
            md: 'row',
          },
          alignItems: { xs: 'flex-start', md: 'center' },
        }}
      />
      {displayVaccinesInDoses && !!valueInUnitsOrPacks && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: 'flex', justifyContent: 'flex-end', pt: 0.3, pr: 1.3 }}
        >
          {valueInDoses} {t('label.doses').toLowerCase()}
        </Typography>
      )}
    </Box>
  );
};

interface NumericInputOptions {
  onChange?: (value?: number) => void;
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
      showExtraFields?: boolean;
      displayVaccinesInDoses?: boolean;
      dosesPerUnit: number;
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
      endAdornmentOverride,
      sx = {},
    } = options;

    return (
      <NumInputRow
        defaultPackSize={commonProps.defaultPackSize}
        representation={commonProps.representation}
        unitName={commonProps.unitName}
        showExtraFields={commonProps.showExtraFields}
        displayVaccinesInDoses={commonProps.displayVaccinesInDoses}
        disabled={disabledOverride ?? commonProps.disabled}
        label={t(label)}
        value={value ?? 0}
        onChange={onChange}
        endAdornmentOverride={endAdornmentOverride}
        sx={sx}
        dosesPerUnit={commonProps.dosesPerUnit}
      />
    );
  };
