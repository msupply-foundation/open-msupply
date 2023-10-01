import React from 'react';

import { CellProps } from '../../../columns';
import { FiberManualRecordIcon } from '@openmsupply-client/common';
import { RecordWithId } from '@common/types';
import { useBufferState } from '@common/hooks';

export const DotCell = <T extends RecordWithId>({
  rowData,
  column,
}: CellProps<T>): React.ReactElement<CellProps<T>> => {
  const [buffer] = useBufferState(column.accessor({ rowData }));

  return (
    <>{buffer ? <FiberManualRecordIcon sx={{ color: 'black' }} /> : null}</>
  );
};
