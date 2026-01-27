import React from 'react';
import {
  DosesCaption,
  Grid,
  NumericTextDisplay,
  QuantityUtils,
  DisplayUtils,
  RepresentationValue,
  SxProps,
  Theme,
  Typography,
  useIntlUtils,
  useTranslation,
} from '@openmsupply-client/common';

interface InfoRowProps {
  label: string;
  value?: number | string;
  packagingDisplay?: string;
  sx?: SxProps<Theme>;
  decimalLimit?: number;
  dosesCaption?: React.ReactNode;
}

export const InfoRow = ({
  label,
  value,
  packagingDisplay,
  sx,
  decimalLimit,
  dosesCaption,
}: InfoRowProps) => {
  return (
    <Grid
      container
      spacing={1}
      marginBottom={1}
      pl={1}
      pr={1.5}
      borderRadius={2}
      sx={sx}
    >
      <Grid size={8}>
        <Typography variant="body1" fontWeight={700}>
          {label}:
        </Typography>
      </Grid>
      <Grid
        size={4}
        display="flex"
        flexDirection="column"
        alignItems="flex-end"
      >
        {typeof value === 'number' ? (
          <>
            <NumericTextDisplay
              value={value}
              packagingDisplay={packagingDisplay}
              decimalLimit={decimalLimit}
            />
            {dosesCaption}
          </>
        ) : (
          <Typography variant="body1">
            {value} {packagingDisplay}
          </Typography>
        )}
      </Grid>
    </Grid>
  );
};

interface ValueInfoRowProps extends Omit<InfoRowProps, 'value'> {
  value?: number | null;
  representation: RepresentationValue;
  defaultPackSize: number;
  unitName: string;
  nullDisplay?: string;
  endAdornmentOverride?: string;
  displayVaccinesInDoses?: boolean;
  dosesPerUnit?: number;
}

export type ValueInfo = {
  label: string;
  endAdornmentOverride?: string;
  value?: number | null;
  sx?: SxProps<Theme>;
  displayVaccinesInDoses?: boolean;
  dosesPerUnit?: number;
};

export const ValueInfoRow = ({
  label,
  value,
  representation,
  defaultPackSize,
  unitName,
  sx,
  endAdornmentOverride,
  displayVaccinesInDoses = false,
  dosesPerUnit = 1,
  nullDisplay,
  decimalLimit,
}: ValueInfoRowProps) => {
  const t = useTranslation();
  const { getPlural } = useIntlUtils();

  const valueInUnitsOrPacks = QuantityUtils.useValueInUnitsOrPacks(
    representation,
    defaultPackSize,
    value
  );

  const endAdornment = DisplayUtils.useEndAdornment(
    t,
    getPlural,
    unitName,
    representation,
    valueInUnitsOrPacks,
    endAdornmentOverride
  );

  const treatAsNull = value === null && nullDisplay;

  const displayValue = treatAsNull ? nullDisplay : valueInUnitsOrPacks;

  const dosesCaption =
    displayVaccinesInDoses && !!value ? (
      <DosesCaption
        value={value}
        dosesPerUnit={dosesPerUnit}
        displayVaccinesInDoses={displayVaccinesInDoses}
        sx={{ pr: 0 }}
      />
    ) : null;

  return (
    <>
      <InfoRow
        label={label}
        value={displayValue}
        packagingDisplay={treatAsNull ? '' : endAdornment}
        sx={sx}
        decimalLimit={decimalLimit}
        dosesCaption={dosesCaption}
      />
    </>
  );
};
