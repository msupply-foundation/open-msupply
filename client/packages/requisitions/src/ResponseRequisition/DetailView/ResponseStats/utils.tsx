import React from 'react';
import {
  Typography,
  LocaleKey,
  TypedTFunction,
  Box,
  RepresentationValue,
  DisplayUtils,
} from '@openmsupply-client/common';

type StatsInfoProps = {
  t: TypedTFunction<LocaleKey>;
  getPlural: (word: string, value: number) => string;
  round: (value?: number, dp?: number) => string;
  unit: string;
  representation: RepresentationValue;
  label: LocaleKey;
  value: number;
  backgroundColor?: string;
};

const StatsInfoValue = ({
  t,
  getPlural,
  round,
  unit,
  representation,
  label,
  value,
  backgroundColor = 'gray.dark',
}: StatsInfoProps) => (
  <Box display="flex" alignItems="center" gap={1}>
    <Box
      sx={{
        backgroundColor,
        height: 10,
        width: 10,
        minWidth: 10,
        minHeight: 10,
      }}
    />
    <Typography width={150} fontSize={12} style={{ textAlign: 'start' }}>
      {t(label)}
    </Typography>
    <Typography
      fontWeight={800}
      fontSize={12}
      sx={{
        display: 'flex',
        alignItems: 'center',
      }}
    >
      {round(value, 2)}
      &nbsp;
      {DisplayUtils.useEndAdornment(t, getPlural, unit, representation, value)}
    </Typography>
  </Box>
);

export const stats =
  (
    t: TypedTFunction<LocaleKey>,
    getPlural: (word: string, value: number) => string,
    round: (value?: number, dp?: number) => string,
    unit: string,
    representation: RepresentationValue
  ) =>
  (
    label: LocaleKey,
    value: number | null | undefined,
    backgroundColor?: string
  ) => {
    if (value === null || value === undefined) return null;

    return (
      <StatsInfoValue
        t={t}
        getPlural={getPlural}
        round={round}
        unit={unit}
        representation={representation}
        label={label}
        value={value}
        backgroundColor={backgroundColor}
      />
    );
  };

export const calculatePercentage = (part: number, total: number): number => {
  if (total === 0) return 0;
  return part >= total ? 100 : Math.round((100 * part) / total);
};
