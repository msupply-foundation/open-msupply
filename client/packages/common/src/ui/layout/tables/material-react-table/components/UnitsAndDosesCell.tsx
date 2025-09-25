import React from 'react';
import {
  useTranslation,
  Typography,
  useFormatNumber,
  usePreferences,
  NumericTextDisplay,
  UNDEFINED_STRING_VALUE,
} from '@openmsupply-client/common';
import { MRT_Cell, MRT_RowData } from 'material-react-table';
import { ItemRowFragment } from 'packages/system/src';

export const UnitsAndDosesCell = <T extends MRT_RowData>({
  cell,
  item,
}: {
  cell: MRT_Cell<T>;
  item: ItemRowFragment;
}) => {
  const t = useTranslation();
  const { format } = useFormatNumber();
  const { manageVaccinesInDoses } = usePreferences();

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
