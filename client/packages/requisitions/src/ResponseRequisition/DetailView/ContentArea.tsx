import React from 'react';
import {
  DataTable,
  NothingHere,
  useTranslation,
} from '@openmsupply-client/common';
import { useResponse, ResponseLineFragment } from '../api';

interface ContentAreaProps {
  onAddItem: () => void;
  onRowClick: null | ((line: ResponseLineFragment) => void);
  disableAddLine: boolean;
}

export const ContentArea = ({
  onRowClick,
  onAddItem,
  disableAddLine,
}: ContentAreaProps) => {
  const t = useTranslation();
  const { columns, lines } = useResponse.line.list();

  return (
    <DataTable
      id="requisition-detail"
      onRowClick={onRowClick}
      columns={columns}
      data={lines}
      noDataElement={
        <NothingHere
          buttonText={t('button.add-item')}
          onCreate={disableAddLine ? undefined : onAddItem}
        />
      }
    />
  );
};
