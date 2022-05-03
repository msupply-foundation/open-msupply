import React from 'react';
import { DataTable, NothingHere } from '@openmsupply-client/common';
import { useResponseLines, ResponseLineFragment } from '../api';

interface ContentAreaProps {
  onRowClick: null | ((line: ResponseLineFragment) => void);
}

export const ContentArea = ({ onRowClick }: ContentAreaProps) => {
  const { columns, lines } = useResponseLines();

  return (
    <DataTable
      onRowClick={onRowClick}
      columns={columns}
      data={lines}
      noDataElement={<NothingHere />}
    />
  );
};
