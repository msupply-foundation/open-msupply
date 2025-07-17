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
  const tooltip = formatNumber.tooltip(packQuantity);

  return (
    <BasicCellLayout isError={isError}>
      <Tooltip title={tooltip}>
        <Typography style={{ color: 'red' }}>
          {!!NumUtils.hasMoreThanTwoDp(packQuantity)
            ? `${roundedPackQuantity}...`
            : roundedPackQuantity}
        </Typography>
      </Tooltip>
    </BasicCellLayout>
  );
};
