import React from 'react';
import {
  useTranslation,
  NumUtils,
  CellProps,
  Box,
  NumberCell,
  Typography,
  RecordWithId,
} from '@openmsupply-client/common';

export const UnitsAndMaybeDoses = <T extends RecordWithId>({
  numberCellProps,
  units,
  isVaccine,
  dosesPerUnit,
  displayDoses,
}: {
  numberCellProps: CellProps<T>;
  units: number;
  isVaccine: boolean;
  dosesPerUnit: number;
  displayDoses?: boolean;
}) => {
  const t = useTranslation();

  // Doses should always be a whole number, round if fractional packs are giving us funky decimals
  const doseCount = NumUtils.round(dosesPerUnit * units);

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        width: '100%',
      }}
    >
      <NumberCell {...numberCellProps} />
      {displayDoses && isVaccine && (
        <Typography
          sx={{
            fontSize: 'small',
            color: 'text.secondary',
            marginLeft: '-6px',
          }}
        >
          ({doseCount} {t('label.doses-short')})
        </Typography>
      )}
    </Box>
  );
};
