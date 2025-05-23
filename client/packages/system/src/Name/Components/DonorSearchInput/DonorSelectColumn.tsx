import React from 'react';
import {
  CellProps,
  ColumnDescription,
  RecordWithId,
} from '@openmsupply-client/common';
import { DonorSearchInput } from '.';
import { NameRowFragment } from '../../api';

export const getDonorColumn = <T extends RecordWithId>(
  update: (id: string, donor: NameRowFragment | null) => void
): ColumnDescription<T> => {
  return {
    key: 'donorId',
    label: 'label.donor',
    width: 200,
    Cell: ({ rowData, column }: CellProps<T>): JSX.Element => (
      <DonorSearchInput
        donorId={column.accessor({ rowData }) as string | null}
        onChange={donor => update(rowData.id, donor)}
        width={200}
        clearable
      />
    ),
  };
};
