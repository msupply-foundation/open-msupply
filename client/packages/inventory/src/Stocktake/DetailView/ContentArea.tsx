// import React, { FC } from 'react';
// import { DataTable, useTranslation } from '@openmsupply-client/common';
// import { useCustomerRequisitionColumns } from './columns';
// import { useCustomerRequisitionLines } from '../api';

// export const ContentArea: FC = () => {
//   const { lines, onChangeSortBy, sortBy, pagination } =
//     useCustomerRequisitionLines();
//   const columns = useCustomerRequisitionColumns({ sortBy, onChangeSortBy });
//   const t = useTranslation('common');

//   return (
//     <DataTable
//       pagination={{ ...pagination, total: lines.length }}
//       columns={columns}
//       data={lines}
//       onChangePage={pagination.onChangePage}
//       noDataMessage={t('error.no-items')}
//     />
//   );
// };
