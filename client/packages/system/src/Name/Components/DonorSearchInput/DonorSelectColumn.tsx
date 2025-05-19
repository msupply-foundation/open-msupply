import React from 'react';
import { CellProps, ColumnDescription } from '@openmsupply-client/common';
import { DonorSearchInput } from '.';

type LineWithDonor = {
  id: string;
  donorId?: string | null;
};

export const getDonorColumn = <T extends LineWithDonor>(
  update: (patch: Partial<T> & { id: string }) => void
): ColumnDescription<T> => {
  return {
    key: 'donorId',
    label: 'label.donor',
    width: 200,
    Cell: DonorCell,
    setter: patch => update({ ...patch }),
  };
};

const DonorCell = <T extends LineWithDonor>({
  rowData,
  column,
}: CellProps<T>): JSX.Element => (
  <DonorSearchInput
    donorId={rowData.donorId ?? null}
    onChange={donor => column.setter({ ...rowData, donorId: donor?.id })}
    width={200}
    clearable
  />
);
