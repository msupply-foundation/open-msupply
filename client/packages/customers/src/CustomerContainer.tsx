import React, { FC } from 'react';
import { useMatch } from 'react-router-dom';
import { RouteBuilder, Typography } from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';

const TransactionService = React.lazy(
  () => import('@openmsupply-client/transactions/src/TransactionService')
);

const RequisitionService: React.FC = () => (
  <Typography style={{ margin: 25 }}>coming soon..</Typography>
);

const fullCustomerInvoicePath = RouteBuilder.create(AppRoute.Customers)
  .addPart(AppRoute.CustomerInvoice)
  .addWildCard()
  .build();

const fullCustomerRequisitionPath = RouteBuilder.create(AppRoute.Customers)
  .addPart(AppRoute.CustomerRequisition)
  .addWildCard()
  .build();

const CustomerContainer: FC = () => {
  if (useMatch(fullCustomerInvoicePath)) {
    return <TransactionService />;
  }
  if (useMatch(fullCustomerRequisitionPath)) {
    return <RequisitionService />;
  }

  return <></>;
};

export default CustomerContainer;
