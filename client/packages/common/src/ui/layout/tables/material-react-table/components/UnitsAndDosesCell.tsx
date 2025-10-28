import React from 'react';
import {
  useTranslation,
  Typography,
  useFormatNumber,
  usePreferences,
  NumericTextDisplay,
  UNDEFINED_STRING_VALUE,
  AlertIcon,
} from '@openmsupply-client/common';
import { ItemRowFragment } from '@openmsupply-client/system';
import { MRT_Cell, MRT_Row, MRT_RowData } from 'material-react-table';

export const UnitsAndDosesCell = <T extends MRT_RowData>({
  cell,
  row,
  showAlert,
}: {
  cell: MRT_Cell<T>;
  row: MRT_Row<T & { item: ItemRowFragment }>;
  showAlert?: boolean;
}) => {
  const t = useTranslation();
  const { format } = useFormatNumber();
  const { manageVaccinesInDoses } = usePreferences();
  const { item } = row.original;

  const value = cell.getValue<number | undefined>();

  // Doses should always be a whole number, round if fractional packs are giving
  // us funky decimals
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
      {showAlert && (
        <AlertIcon
          sx={{
            color: theme => theme.palette.error.main,
            position: 'absolute',
            right: 0,
            width: '0.7em',
          }}
        />
      )}
    </>
  );
};
