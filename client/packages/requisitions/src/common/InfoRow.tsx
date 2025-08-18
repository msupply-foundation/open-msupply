import React, { useMemo } from 'react';
import {
  Grid,
  NumericTextDisplay,
  SxProps,
  Theme,
  Typography,
  useFormatNumber,
  useIntlUtils,
  useTranslation,
} from '@openmsupply-client/common';
import {
  useEndAdornment,
  useValueInUnitsOrPacks,
  RepresentationValue,
  calculateValueInDoses,
} from './utils';

interface InfoRowProps {
  label: string;
  value?: number | string;
  packagingDisplay?: string;
  sx?: SxProps<Theme>;
  displayVaccinesInDoses?: boolean;
  doses?: number | string;
  dosesLabel?: string;
}

export const InfoRow = ({
  label,
  value,
  packagingDisplay,
  sx,
  displayVaccinesInDoses = false,
  doses,
  dosesLabel,
}: InfoRowProps) => {
  return (
    <Grid
      container
      spacing={1}
      marginBottom={1}
      px={1}
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
          <NumericTextDisplay value={value} />
        ) : (
          <Typography variant="body1">
            {value} {packagingDisplay}
          </Typography>
        )}
        {displayVaccinesInDoses && (
          <Typography variant="caption" color="text.secondary">
            {doses ? `(${doses} ${dosesLabel?.toLowerCase()})` : ''}
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
}: ValueInfoRowProps) => {
  const t = useTranslation();
  const { getPlural } = useIntlUtils();
  const { round } = useFormatNumber();

  const valueInUnitsOrPacks = useValueInUnitsOrPacks(
    representation,
    defaultPackSize,
    value
  );

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

  const endAdornment = useEndAdornment(
    t,
    getPlural,
    unitName,
    representation,
    valueInUnitsOrPacks,
    endAdornmentOverride
  );

  const treatAsNull = value === null && nullDisplay;

  const displayValue = treatAsNull ? nullDisplay : valueInUnitsOrPacks;

  return (
    <InfoRow
      label={label}
      value={displayValue}
      packagingDisplay={treatAsNull ? '' : endAdornment}
      sx={sx}
      displayVaccinesInDoses={displayVaccinesInDoses && !!valueInUnitsOrPacks}
      doses={valueInDoses}
      dosesLabel={t('label.doses')}
    />
  );
};
