import React from 'react';
import { NonNegativeIntegerCell, CellProps } from '@openmsupply-client/common';
import { DraftOutboundLine } from '../../types';

export const PackQuantityCell = (props: CellProps<DraftOutboundLine>) => (
  <NonNegativeIntegerCell
    max={props.rowData.stockLine?.availableNumberOfPacks}
    {...props}
  />
);
