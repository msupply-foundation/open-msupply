import React from 'react';
import { ExpiryDateInput } from '@common/components';
import { RecordWithId } from '@common/types';
import { EnvUtils } from '@common/utils';
import { ColumnDefinition } from '../../columns';
import { DateUtils } from '@common/intl';

export const getExpiryDateInputColumn = <
  T extends RecordWithId & { expiryDate?: string | Date | null },
>(): ColumnDefinition<T> => ({
  key: 'expiryDateInput',
  label: 'label.expiry',
  accessor: ({ rowData }) => {
    if ('expiryDate' in rowData) {
      return rowData.expiryDate;
    } else {
      if (!EnvUtils.isProduction()) {
        // TODO: Bugsnag during prod
        throw new Error(`
        The default accessor for the expiry input column has been called with row data
        that does not have an 'expiryDate' field.

        This column requires the field 'expiryDate' to be present in the row data to render
        correctly.

        Have you forgotten to provide a custom accessor to return the expiry date? i.e.
        [ ExpiryDateInputColumn, { accessor: ({rowData}) => ({ location: rowData.stockLine.expiryDate }) }]
        `);
      } else {
        return null;
      }
    }
  },
  Cell: ({ rowData, column, isDisabled }) => {
    const date = column.accessor({ rowData }) as string;
    const value = DateUtils.getDateOrNull(date);

    const onChange = (newValue: Date | null) => {
      column.setter({ ...rowData, expiryDate: newValue });
    };

    return (
      <ExpiryDateInput
        value={value}
        onChange={onChange}
        disabled={!!isDisabled}
      />
    );
  },
});
