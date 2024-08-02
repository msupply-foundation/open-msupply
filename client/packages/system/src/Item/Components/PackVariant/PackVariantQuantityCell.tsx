import React, { ReactElement } from 'react';
import {
  RecordWithId,
  CellProps,
  BasicCellLayout,
  Tooltip,
  Typography,
  useFormatNumber,
} from '@openmsupply-client/common';
import { usePackVariant } from '../../context';

// Adjust quantity to reflect selected pack variant
export const PackVariantQuantityCell =
  <T extends RecordWithId>({
    getItemId,
    getQuantity,
  }: {
    getItemId: (row: T) => string;
    getQuantity: (row: T) => number;
  }) =>
  ({ isError, rowData }: CellProps<T>): ReactElement => {
    const { numberOfPacksFromQuantity } = usePackVariant(
      getItemId(rowData),
      null
    );
    const formatNumber = useFormatNumber();
    const quantity = getQuantity(rowData);
    const packQuantity = numberOfPacksFromQuantity(quantity);
    const hasMoreThanTwoDp = (packQuantity * 100) % 1 !== 0;
    const roundedPackQuantity = formatNumber.round(packQuantity, 2);

    return (
      <BasicCellLayout isError={isError}>
        <Tooltip title={String(packQuantity)}>
          <Typography>
            {hasMoreThanTwoDp
              ? `${roundedPackQuantity}...`
              : roundedPackQuantity}
          </Typography>
        </Tooltip>
      </BasicCellLayout>
    );
  };
