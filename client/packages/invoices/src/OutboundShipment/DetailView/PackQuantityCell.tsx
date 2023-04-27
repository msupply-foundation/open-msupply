import React from 'react';
import { NonNegativeIntegerCell, CellProps } from '@openmsupply-client/common';
import { DraftOutboundLine } from '../../types';

export const PackQuantityCell = (props: CellProps<DraftOutboundLine>) => (
  <NonNegativeIntegerCell
    max={props.rowData.stockLine?.availableNumberOfPacks}
    id={`pack_quantity_${props.rowData.stockLine?.batch}`}
    {...props}
  />
);
