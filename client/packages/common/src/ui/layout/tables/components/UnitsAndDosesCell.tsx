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
import { MRT_Cell, MRT_Row, MRT_RowData } from 'material-react-table';

interface ItemData {
  doses?: number;
  isVaccine?: boolean;
}

export const UnitsAndDosesCell = <T extends MRT_RowData>({
  cell,
  row,
  showAlert,
  roundUp,
  decimalLimit,
  packSize,
  doses,
  isVaccine,
}: {
  cell: MRT_Cell<T>;
  row: MRT_Row<T & { item?: ItemData }>;
  showAlert?: boolean;
  roundUp?: boolean;
  decimalLimit?: number;
  /** When the cell value is in packs (not units), pass packSize to get correct dose count */
  packSize?: number;
  /** Override the dose count when the row doesn't nest it under `item` (e.g. item list rows). */
  doses?: number;
  /** Override the vaccine flag when the row doesn't nest it under `item`. */
  isVaccine?: boolean;
}) => {
  const t = useTranslation();
  const { format } = useFormatNumber();
  const { manageVaccinesInDoses } = usePreferences();
  const item = row.original?.item;
  const resolvedDoses = doses ?? item?.doses;
  const resolvedIsVaccine = isVaccine ?? item?.isVaccine;

  const value = cell.getValue<number | undefined>();

  // Doses should always be a whole number, round if fractional packs are giving
  // us funky decimals
  const doseCount = format(
    (resolvedDoses ?? 1) * (packSize ?? 1) * (value ?? 0),
    {
      maximumFractionDigits: 0,
    }
  );

  return (
    <>
      <NumericTextDisplay
        value={typeof value === 'number' ? value : undefined}
        defaultValue={UNDEFINED_STRING_VALUE}
        roundUp={roundUp}
        decimalLimit={decimalLimit}
      />
      {manageVaccinesInDoses && resolvedIsVaccine && (
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
            marginLeft: '0.2em',
            width: '0.7em',
          }}
        />
      )}
    </>
  );
};
