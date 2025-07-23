import React, { ReactElement } from 'react';
import {
  CellProps,
  RecordWithId,
  Typography,
  VvmstatusNode,
} from '@openmsupply-client/common';

export const VvmStatusCell = <T extends RecordWithId>({
  column,
  rowData,
}: CellProps<T>): ReactElement => {
  const vvmStatus = column.accessor({ rowData }) as VvmstatusNode;
  return (
    <Typography sx={{ color: vvmStatus?.unusable ? 'error.main' : 'inherit' }}>
      {vvmStatus?.description}
    </Typography>
  );
};
