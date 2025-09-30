import React from 'react';
import {
  useTranslation,
  Typography,
  useFormatNumber,
  usePreferences,
  NumericTextDisplay,
  UNDEFINED_STRING_VALUE,
  DefaultCellProps,
} from '@openmsupply-client/common';
import { ItemRowFragment } from '@openmsupply-client/system';

export const UnitsAndDosesCell = <T extends { item: ItemRowFragment }>({
  cell,
  row,
}: DefaultCellProps<T>) => {
  const t = useTranslation();
  const { format } = useFormatNumber();
  const { manageVaccinesInDoses } = usePreferences();
  const { item } = row.original;

  const value = cell.getValue<number | undefined>();

  // Doses should always be a whole number, round if fractional packs are giving us funky decimals
  const doseCount = format(item.doses * (value ?? 0), {
    maximumFractionDigits: 0,
  });

  return (
    <>
      <NumericTextDisplay
        value={typeof value === 'number' ? value : undefined}
        defaultValue={UNDEFINED_STRING_VALUE}
      />
      {manageVaccinesInDoses && item.isVaccine && (
        <Typography
          sx={{
            fontSize: 'small',
            color: 'text.secondary',
            marginLeft: '4px',
          }}
        >
          ({doseCount} {t('label.doses-short')})
        </Typography>
      )}
    </>
  );
};
