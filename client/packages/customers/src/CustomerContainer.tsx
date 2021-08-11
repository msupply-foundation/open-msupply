import React, { FC } from 'react';

const TransactionService = React.lazy(
  () => import('transactions/TransactionService')
);

const CustomerContainer: FC = () => {
  return <TransactionService />;
};

export default CustomerContainer;
