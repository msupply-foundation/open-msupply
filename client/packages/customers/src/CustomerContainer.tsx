import { Typography, useHostContext } from '@openmsupply-client/common';
import React, { FC, useEffect } from 'react';
import { useMatch } from 'react-router-dom';

const TransactionService = React.lazy(
  () => import('transactions/TransactionService')
);

const RequsitionsService: React.FC = () => (
  <Typography style={{ marginLeft: 25, marginTop: 75 }}>
    coming soon..
  </Typography>
);

const CustomerContainer: FC = () => {
  const { setTitleKey } = useHostContext();
  const isInvoice = useMatch('/customers/customer-invoice/*');
  const isRequsition = useMatch('/customers/customer-requisition/*');
  const titleKey = isInvoice
    ? 'app.customer_invoices'
    : isRequsition
    ? 'app.customer_requisitions'
    : 'app.customers';

  useEffect(() => setTitleKey(titleKey), [titleKey]);
  switch (titleKey) {
    case 'app.customer_invoices':
      return <TransactionService />;
    case 'app.customer_requisitions':
      return <RequsitionsService />;
    default:
      return <></>;
  }
};

export default CustomerContainer;
