import React, { ReactElement } from 'react';
import {
  CellProps,
  RecordWithId,
  Tooltip,
  Typography,
  useTranslation,
  VvmstatusNode,
} from '@openmsupply-client/common';

export const VvmStatusCell = <T extends RecordWithId>({
  column,
  rowData,
}: CellProps<T>): ReactElement => {
  const t = useTranslation();
  const vvmStatus = column.accessor({ rowData }) as VvmstatusNode;
  const isUnusable = vvmStatus?.unusable;
  const title = isUnusable ? t('title.vvm-unusable') : '';

  return (
    <Tooltip title={title} placement="top">
      <Typography sx={{ color: isUnusable ? 'error.main' : 'inherit' }}>
        {vvmStatus?.description}
      </Typography>
    </Tooltip>
  );
};
