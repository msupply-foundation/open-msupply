import React, { FC } from 'react';
import { DataTable, useTranslation } from '@openmsupply-client/common';
import { useSupplierRequisitionColumns } from './columns';
import { useRequestRequisitionLines } from '../api';

export const ContentArea: FC = () => {
  const { lines, onChangeSortBy, sortBy, pagination } =
    useRequestRequisitionLines();
  const columns = useSupplierRequisitionColumns({ sortBy, onChangeSortBy });
  const t = useTranslation('common');

  return (
    <DataTable
      pagination={{ ...pagination, total: lines.length }}
      columns={columns}
      data={lines}
      onChangePage={pagination.onChangePage}
      noDataMessage={t('error.no-items')}
    />
  );
};
