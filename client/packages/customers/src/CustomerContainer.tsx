import { Typography } from '@openmsupply-client/common';
import React, { FC } from 'react';
import { useMatch } from 'react-router-dom';

const TransactionService = React.lazy(
  () => import('transactions/TransactionService')
);

const RequisitionService: React.FC = () => (
  <Typography style={{ marginLeft: 25, marginTop: 75 }}>
    coming soon..
  </Typography>
);

const CustomerContainer: FC = () => {
  if (useMatch('/customers/customer-invoice/*')) {
    return <TransactionService />;
  }
  if (useMatch('/customers/customer-requisition/*')) {
    return <RequisitionService />;
  }

  return <></>;
};

export default CustomerContainer;
