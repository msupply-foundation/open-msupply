import React from 'react';
import {
  useTranslation,
  useIntlUtils,
  Typography,
  SxProps,
  Theme,
  QuantityUtils,
  useFormatNumber,
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
  const { getPlural } = useIntlUtils();
  const { round } = useFormatNumber();

  const displayValue = dosesSelected
    ? value
    : QuantityUtils.calculateValueInDoses(dosesPerUnit, value);

  const count = displayValue === 1 ? 1 : 2;
  const label = dosesSelected
    ? getPlural((unitsLabel ?? t('label.unit')).toLowerCase(), count)
    : getPlural(t('label.dose').toLowerCase(), count);

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
      {round(displayValue)} {label}
    </Typography>
  );
};
