import React from 'react';
import {
  useTranslation,
  Typography,
  SxProps,
  Theme,
  QuantityUtils,
} from '@openmsupply-client/common';

interface DosesOrUnitsCaptionProps {
  /** Input value always in units */
  value: number;
  dosesPerUnit: number;
  dosesSelected?: boolean;
  unitsLabel?: string;
  sx?: SxProps<Theme>;
}

export const DosesOrUnitsCaption = ({
  value,
  dosesPerUnit,
  dosesSelected = false,
  unitsLabel,
  sx,
}: DosesOrUnitsCaptionProps) => {
  const t = useTranslation();

  const displayValue = dosesSelected
    ? value
    : QuantityUtils.calculateValueInDoses(dosesPerUnit, value);

  const label = dosesSelected
    ? (unitsLabel ?? t('label.unit')).toLowerCase()
    : t('label.doses').toLowerCase();

  return (
    <Typography
      variant="caption"
      color="text.secondary"
      sx={{
        display: 'flex',
        justifyContent: 'flex-end',
        pt: 0.3,
        pr: 1.2,
        ...sx,
      }}
    >
      {displayValue} {label}
    </Typography>
  );
};
