import React, { useMemo } from 'react';
import {
  useTranslation,
  Typography,
  useFormatNumber,
  SxProps,
  Theme,
} from '@openmsupply-client/common';
import {
  calculateValueInDoses,
  RepresentationValue,
} from 'packages/requisitions/src/common';

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
  const valueInDoses = useMemo(
    () =>
      displayVaccinesInDoses
        ? round(
            calculateValueInDoses(
              representation,
              defaultPackSize || 1,
              dosesPerUnit,
              value
            )
          )
        : undefined,
    [
      displayVaccinesInDoses,
      representation,
      defaultPackSize,
      dosesPerUnit,
      value,
    ]
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
      {valueInDoses} {t('label.doses').toLowerCase()}
    </Typography>
  );
};
