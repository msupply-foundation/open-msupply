import React, { ReactElement } from 'react';
import {
  RecordWithId,
  CellProps,
  BasicCellLayout,
  NumericTextDisplay,
} from '@openmsupply-client/common';

export const PackQuantityCell = <T extends RecordWithId>({
  isError,
  rowData,
  column,
}: CellProps<T>): ReactElement => {
  const quantity = column.accessor({ rowData });
  const packQuantity = Number(quantity ?? 0);

  return (
    <BasicCellLayout isError={isError}>
      <NumericTextDisplay value={packQuantity} />
    </BasicCellLayout>
  );
};
