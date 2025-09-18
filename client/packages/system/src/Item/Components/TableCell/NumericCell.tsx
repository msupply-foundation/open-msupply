import React, { ReactElement } from 'react';
import {
  RecordWithId,
  CellProps,
  BasicCellLayout,
  useFormatNumber,
  Box,
  Typography,
} from '@openmsupply-client/common';

interface NumericCellProps<T extends RecordWithId> extends CellProps<T> {
  precision?: number;
}

export const NumericCell = <T extends RecordWithId>({
  isError,
  rowData,
  column,
  precision,
}: NumericCellProps<T>): ReactElement => {
  const format = useFormatNumber();

  const quantity = column.accessor({ rowData });
  const displayQuantity = format.round(Number(quantity ?? 0), precision ?? 1);

  return (
    <BasicCellLayout isError={isError}>
      <Box
        sx={{
          padding: '4px 8px',
        }}
      >
        <Typography
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            textAlign: 'right',
            fontSize: 'inherit',
          }}
        >
          {displayQuantity}
        </Typography>
      </Box>
    </BasicCellLayout>
  );
};
