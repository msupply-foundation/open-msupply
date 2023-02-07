import React from 'react';
import { ExpiryDateInput } from '@common/components';
import { RecordWithId } from '@common/types';
import { TypeUtils, EnvUtils } from '@common/utils';
import { ColumnDefinition } from '../../columns';

export const getExpiryDateInputColumn = <
  T extends RecordWithId
>(): ColumnDefinition<T> => ({
  key: 'expiryDateInput',
  label: 'label.expiry',
  accessor: ({ rowData }) => {
    if (
      TypeUtils.isTypeOf<{ expiryDate: Date | null }>(rowData, 'expiryDate')
    ) {
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
    const value = column.accessor({ rowData }) as Date | null;

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
