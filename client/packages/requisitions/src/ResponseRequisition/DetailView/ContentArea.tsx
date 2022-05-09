import React from 'react';
import { DataTable, NothingHere } from '@openmsupply-client/common';
import { useResponse, ResponseLineFragment } from '../api';

interface ContentAreaProps {
  onRowClick: null | ((line: ResponseLineFragment) => void);
}

export const ContentArea = ({ onRowClick }: ContentAreaProps) => {
  const { columns, lines } = useResponse.line.list();

  return (
    <DataTable
      onRowClick={onRowClick}
      columns={columns}
      data={lines}
      noDataElement={<NothingHere />}
    />
  );
};
