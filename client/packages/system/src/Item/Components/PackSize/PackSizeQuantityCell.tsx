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

// Adjust quantity to reflect selected pack variant
export const PackSizeQuantityCell =
  <T extends RecordWithId>({
    getPackSize,
    getQuantity,
  }: {
    getPackSize: (row: T) => number;
    getQuantity: (row: T) => number;
  }) =>
  ({ isError, rowData }: CellProps<T>): ReactElement => {
    const formatNumber = useFormatNumber();
    const quantity = getQuantity(rowData);
    const packQuantity = quantity / getPackSize(rowData);
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
