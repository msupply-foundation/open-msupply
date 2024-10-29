import React, { ReactElement } from 'react';
import {
  RecordWithId,
  CellProps,
  BasicCellLayout,
  Tooltip,
  Typography,
  useFormatNumber,
  NumUtils,
} from '@openmsupply-client/common';

export const PackQuantityCell = <T extends RecordWithId>({
  isError,
  rowData,
  column,
}: CellProps<T>): ReactElement => {
  const formatNumber = useFormatNumber();
  const quantity = column.accessor({ rowData });
  const packQuantity = Number(quantity ?? 0);
  const roundedPackQuantity = formatNumber.round(packQuantity, 2);

  return (
    <BasicCellLayout isError={isError}>
      <Tooltip title={String(packQuantity)}>
        <Typography>
          {!!NumUtils.hasMoreThanTwoDp(packQuantity)
            ? `${roundedPackQuantity}...`
            : roundedPackQuantity}
        </Typography>
      </Tooltip>
    </BasicCellLayout>
  );
};
