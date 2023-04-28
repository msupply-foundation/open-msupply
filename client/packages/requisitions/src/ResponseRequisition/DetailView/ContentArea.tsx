import React from 'react';
import { DataTable, NothingHere } from '@openmsupply-client/common';
import { useResponse, ResponseLineFragment } from '../api';

interface ContentAreaProps {
  onRowClick: null | ((line: ResponseLineFragment) => void);
}

export const ContentArea = ({ onRowClick }: ContentAreaProps) => {
  const { columns, lines } = useResponse.line.list();
  let isDisabledForAuthorisation =
    useResponse.utils.isDisabledForAuthorisation();

  return (
    <DataTable
      id="requisition-detail"
      onRowClick={!isDisabledForAuthorisation ? onRowClick : null}
      columns={columns}
      data={lines}
      noDataElement={<NothingHere />}
    />
  );
};
