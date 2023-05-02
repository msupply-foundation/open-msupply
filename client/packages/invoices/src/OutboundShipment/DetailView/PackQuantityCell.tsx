import React from 'react';
import { NonNegativeIntegerCell, CellProps } from '@openmsupply-client/common';
import { DraftOutboundLine } from '../../types';
import { getPackQuantityCellId } from '../../utils';

export const PackQuantityCell = (props: CellProps<DraftOutboundLine>) => (
  <NonNegativeIntegerCell
    max={props.rowData.stockLine?.availableNumberOfPacks}
    id={getPackQuantityCellId(props.rowData.stockLine?.batch)}
    {...props}
  />
);
