import React from 'react';
import { DateUtils, useFormatDateTime } from '@common/intl';

import { MRT_Cell, MRT_RowData } from 'material-react-table';

interface NaiveDateCellProps<T extends MRT_RowData> {
  cell: MRT_Cell<T>;
}

/**
 * Renders a date-only column value (e.g. expiry date, date of birth) in the
 * user's locale. Use this instead of ColumnType.Date for fields that are
 * timezone-agnostic — the default Date cell parses values as UTC midnight,
 * which renders as the previous day in negative-offset timezones.
 */
export const NaiveDateCell = <T extends MRT_RowData>({
  cell,
}: NaiveDateCellProps<T>) => {
  const { localisedDate } = useFormatDateTime();
  const date = DateUtils.getNaiveDate(cell.getValue<string | null>());
  return <>{date ? localisedDate(date) : ''}</>;
};
