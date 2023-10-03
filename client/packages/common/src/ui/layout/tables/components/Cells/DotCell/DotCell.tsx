import React from 'react';

import { CellProps } from '../../../columns';
import { CircleIcon } from '@openmsupply-client/common';
import { RecordWithId } from '@common/types';

export const DotCell = <T extends RecordWithId>({
  rowData,
  column,
}: CellProps<T>): React.ReactElement<CellProps<T>> => {
  return (
    <>
      {column.accessor({ rowData }) === true && (
        <CircleIcon sx={{ color: 'black', transform: 'scale(0.5)' }} />
      )}
    </>
  );
};
