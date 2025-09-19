import React, { FC } from 'react';
import { useIsGrouped, MaterialTable } from '@openmsupply-client/common';
import { MRT_TableInstance } from 'material-react-table';
import { useOutbound } from '../api';
import { StockOutLineFragment } from '../../StockOut';

interface ContentAreaProps {
  table: MRT_TableInstance<StockOutLineFragment>;
}

export const ContentAreaComponent: FC<ContentAreaProps> = ({ table }) => {
  const { isGrouped } = useIsGrouped('outboundShipment');
  const { rows } = useOutbound.line.rows(isGrouped);

  if (!rows) return null;

  return (
    <>
      <MaterialTable table={table} />
    </>
  );
};

export const ContentArea = React.memo(ContentAreaComponent);
