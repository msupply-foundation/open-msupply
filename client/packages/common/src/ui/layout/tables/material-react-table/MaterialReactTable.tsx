/**
 * Simple wrapper around the MaterialReactTable component, to make it 100% width
 *
 * Use this for *all* core tables, along with the respective configuration hooks
 * in this folder
 */

import React from 'react';
import {
  MaterialReactTable,
  MRT_RowData,
  MRT_TableInstance,
} from 'material-react-table';
import { Box } from '@openmsupply-client/common';

interface TableProps<T extends MRT_RowData> {
  table: MRT_TableInstance<T>;
  forceFullWidth?: boolean;
}

export const MaterialTable = <T extends MRT_RowData>({
  table,
  forceFullWidth,
}: TableProps<T>) => {
  if (forceFullWidth) {
    return (
      <Box sx={{ width: '100%' }}>
        <MaterialReactTable table={table} />
      </Box>
    );
  }

  return <MaterialReactTable table={table} />;
};
