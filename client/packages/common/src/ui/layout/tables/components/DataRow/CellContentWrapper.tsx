import React from 'react';
import { Column } from '../../columns/types';
import { RecordWithId } from '@common/types';
import { Box } from '@mui/material';
import { Link } from 'react-router-dom';

interface CellContentWrapperProps<T extends RecordWithId> {
  children: React.ReactNode;
  column: Column<T>;
  rowData: T;
  rowLinkBuilder?: (rowData: T) => string;
}

export const CellContentWrapper = <T extends RecordWithId>({
  children,
  column,
  rowData,
  rowLinkBuilder,
}: CellContentWrapperProps<T>) => {
  return (
    <Box
      component={rowLinkBuilder && !column.customLinkRendering ? Link : Box}
      to={
        rowLinkBuilder && !column.customLinkRendering
          ? rowLinkBuilder(rowData)
          : ''
      }
      sx={{
        display: 'flex',
        width: '100%',
        textDecoration: 'none',
        alignItems: 'center',
        justifyContent: `${column.align}`,
        color: 'inherit',
      }}
    >
      {children}
    </Box>
  );
};
