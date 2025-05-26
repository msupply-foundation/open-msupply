import React, { useMemo } from 'react';
import {
  Box,
  Grid,
  InputWithLabelRow,
  NumericTextInput,
  NumUtils,
  SxProps,
  Theme,
  Typography,
  useFormatNumber,
  useIntlUtils,
  useTranslation,
} from '@openmsupply-client/common';
import {
  getValueInUnitsOrPacks,
  Representation,
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
      borderRadius={2}
      boxShadow={theme => theme.shadows[2]}
    >
      <Grid size={12} sx={{ mb: 2 }}>
        {Top}
      </Grid>
      <Grid size={12} container spacing={2}>
        <Grid size={4}>{Left}</Grid>
        <Grid size={4}>{Middle}</Grid>
        <Grid
          size={4}
          sx={{
            background: theme => theme.palette.background.group,
            padding: '0px 8px',
            borderRadius: 2,
            paddingBottom: 1,
          }}
        >
          {Right}
        </Grid>
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
}

export type ValueInfo = {
  label: string;
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
}: ValueInfoRowProps) => {
  const t = useTranslation();
  const { getPlural } = useIntlUtils();
  const { round } = useFormatNumber();
  const valueInUnitsOrPacks = getValueInUnitsOrPacks(
    representation,
    defaultPackSize,
    value
  );
  const packagingDisplay = useMemo(() => {
    if (representation === Representation.PACKS) {
      return getPlural(t('label.pack').toLowerCase(), valueInUnitsOrPacks);
    }
    return getPlural(unitName.toLowerCase(), valueInUnitsOrPacks);
  }, [representation, unitName]);

  return (
    <InfoRow
      label={label}
      value={round(valueInUnitsOrPacks, 2)}
      packagingDisplay={packagingDisplay}
      sx={sx}
    />
  );
};

interface InputRowProps {
  label: string;
  value: number;
  onChange?: (value?: number) => void;
  disabled: boolean;
  autoFocus?: boolean;
  representation: RepresentationValue;
  defaultPackSize: number;
  unitName: string;
  sx?: SxProps<Theme>;
}

export const InputRow = ({
  label,
  value,
  onChange,
  disabled,
  autoFocus = false,
  representation,
  defaultPackSize,
  unitName,
  sx,
}: InputRowProps) => {
  const t = useTranslation();
  const { getPlural } = useIntlUtils();

  const valueInUnitsOrPacks = getValueInUnitsOrPacks(
    representation,
    defaultPackSize,
    value
  );

  const packagingDisplay = useMemo(() => {
    if (representation === Representation.PACKS) {
      return getPlural(t('label.pack').toLowerCase(), valueInUnitsOrPacks);
    }
    return getPlural(unitName.toLowerCase(), valueInUnitsOrPacks);
  }, [representation, unitName]);

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
              value={NumUtils.round(valueInUnitsOrPacks, 2)}
              onChange={onChange}
              disabled={disabled}
              autoFocus={autoFocus}
              decimalLimit={2}
            />
          }
          label={label}
          sx={{
            justifyContent: 'space-between',
          }}
        />
      </Box>
      <Typography sx={{ pl: 0.5 }}>{packagingDisplay}</Typography>
    </Box>
  );
};
