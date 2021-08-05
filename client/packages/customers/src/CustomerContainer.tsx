import React, { FC } from 'react';
import { Routes, Route } from '@openmsupply-client/common';

const TransactionService = React.lazy(
  () => import('transactions/TransactionService')
);

const CustomerContainer: FC = () => {
  return (
    <Routes>
      <Route
        path="customers/customer-invoice"
        element={<TransactionService />}
      />
    </Routes>
  );
};

export default CustomerContainer;
