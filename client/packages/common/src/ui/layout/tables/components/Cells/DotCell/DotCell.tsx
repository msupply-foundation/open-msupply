import React from 'react';

import { CellProps } from '../../../columns';
import { CircleIcon } from '@openmsupply-client/common';
import { RecordWithId } from '@common/types';

export const DotCell = <T extends RecordWithId>({
  rowData,
  column,
}: CellProps<T>) =>
  column.accessor({ rowData }) === true ? (
    <CircleIcon
      sx={{
        color: theme => theme.typography.body1.color,
        transform: 'scale(0.5)',
      }}
    />
  ) : null;
