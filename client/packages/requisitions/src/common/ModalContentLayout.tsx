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
  getValueInUnitsOrPacks,
  RepresentationValue,
} from './utils';

interface LayoutProps {
  Top: React.ReactElement;
  Left: React.ReactElement | null;
  Middle: React.ReactElement | null;
  Right: React.ReactElement | null;
}

export const ModalContentLayout = ({
  Top,
  Left,
  Middle,
  Right,
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
        <Grid size={4}>{Left}</Grid>
        <Grid size={4}>{Middle}</Grid>
        <Grid size={4}>{Right}</Grid>
      </Grid>
    </Grid>
  );
};

interface InfoRowProps {
  label: string;
  value?: number | string;
  packagingDisplay?: string;
  sx?: SxProps<Theme>;
}

export const InfoRow = ({
  label,
  value,
  packagingDisplay,
  sx,
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
      <Grid size={6}>
        <Typography variant="body1" fontWeight={700}>
          {label}:
        </Typography>
      </Grid>
      <Grid size={6} textAlign="right">
        <Typography variant="body1">
          {value} {packagingDisplay}
        </Typography>
      </Grid>
    </Grid>
  );
};

interface ValueInfoRowProps extends Omit<InfoRowProps, 'value'> {
  value?: number | null;
  representation: RepresentationValue;
  defaultPackSize: number;
  unitName: string;
  endAdornmentOverride?: string;
}

export type ValueInfo = {
  label: string;
  endAdornmentOverride?: string;
  value?: number | null;
  sx?: SxProps<Theme>;
};

export const ValueInfoRow = ({
  label,
  value,
  representation,
  defaultPackSize,
  unitName,
  sx,
  endAdornmentOverride,
}: ValueInfoRowProps) => {
  const t = useTranslation();
  const { getPlural } = useIntlUtils();
  const { round } = useFormatNumber();
  const valueInUnitsOrPacks = getValueInUnitsOrPacks(
    representation,
    defaultPackSize,
    value
  );

  const endAdornment = useEndAdornment(
    t,
    getPlural,
    unitName,
    representation,
    endAdornmentOverride,
    valueInUnitsOrPacks
  );

  return (
    <InfoRow
      label={label}
      value={round(valueInUnitsOrPacks, 2)}
      packagingDisplay={endAdornment}
      sx={sx}
    />
  );
};
