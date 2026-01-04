import React from 'react';
import {
  useTranslation,
  Typography,
  useFormatNumber,
  SxProps,
  Theme,
  RepresentationValue,
  QuantityUtils,
} from '@openmsupply-client/common';

interface DosesCaptionProps {
  value: number;
  representation: RepresentationValue;
  defaultPackSize?: number;
  dosesPerUnit: number;
  displayVaccinesInDoses: boolean;
  sx?: SxProps<Theme>;
}

export const DosesCaption = ({
  value,
  displayVaccinesInDoses,
  representation,
  defaultPackSize,
  dosesPerUnit,
  sx,
}: DosesCaptionProps) => {
  const t = useTranslation();
  const { round } = useFormatNumber();

  // doses always rounded to display in whole numbers
  const valueInDoses = QuantityUtils.useValueInDoses(
    displayVaccinesInDoses,
    representation,
    defaultPackSize || 1,
    dosesPerUnit,
    value
  );

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
      {round(valueInDoses)} {t('label.doses').toLowerCase()}
    </Typography>
  );
};
