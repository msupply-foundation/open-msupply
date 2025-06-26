import React from 'react';
import {
  Grid,
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

interface LayoutProps {
  Top: React.ReactElement;
  Left: React.ReactElement | null;
  Middle: React.ReactElement | null;
  Right: React.ReactElement | null;
  showExtraFields?: boolean;
}

export const ModalContentLayout = ({
  Top,
  Left,
  Middle,
  Right,
  showExtraFields = false,
}: LayoutProps) => {
  return (
    <Grid
      container
      spacing={1}
      direction="row"
      bgcolor="background.toolbar"
      padding={2}
      paddingBottom={1}
    >
      <Grid size={12} sx={{ mb: 2 }}>
        {Top}
      </Grid>
      <Grid size={12} container spacing={2}>
        <Grid size={showExtraFields ? 4 : 6}>{Left}</Grid>
        <Grid size={showExtraFields ? 4 : 6}>{Middle}</Grid>
        {showExtraFields && <Grid size={4}>{Right}</Grid>}
      </Grid>
    </Grid>
  );
};

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
      <Grid size={4} textAlign="right">
        <Typography variant="body1">
          {value} {packagingDisplay}
        </Typography>
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
  const valueInDoses = React.useMemo(
    () =>
      displayVaccinesInDoses
        ? calculateValueInDoses(
            representation,
            defaultPackSize,
            dosesPerUnit,
            valueInUnitsOrPacks
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

  const displayValue = treatAsNull
    ? nullDisplay
    : round(valueInUnitsOrPacks, 2);

  return (
    <InfoRow
      label={label}
      value={displayValue}
      packagingDisplay={treatAsNull ? '' : endAdornment}
      sx={sx}
      displayVaccinesInDoses={displayVaccinesInDoses && !!valueInUnitsOrPacks}
      doses={round(valueInDoses, 2)}
      dosesLabel={t('label.doses')}
    />
  );
};
