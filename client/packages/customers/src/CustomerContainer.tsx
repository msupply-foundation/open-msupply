import React, { FC } from 'react';
import { Navigate, useMatch } from 'react-router-dom';
import {
  Grid,
  InvoiceIcon,
  NavigationButton,
  RouteBuilder,
  Typography,
} from '@openmsupply-client/common';
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

  if (!useMatch(AppRoute.Customers)) {
    const notFoundRoute = RouteBuilder.create(AppRoute.PageNotFound).build();
    return <Navigate to={notFoundRoute} />;
  }

  return (
    <Grid container>
      <Grid container sx={{ padding: 10 }} flexDirection="column">
        <Grid flex={1} item sx={{ margin: 1 }}>
          <NavigationButton
            to={RouteBuilder.create(AppRoute.Customers)
              .addPart(AppRoute.CustomerInvoice)
              .build()}
            labelKey="app.customer-invoice"
            icon={<InvoiceIcon />}
          />
        </Grid>
        <Grid flex={1} item sx={{ margin: 1 }}>
          <NavigationButton
            to={RouteBuilder.create(AppRoute.Customers)
              .addPart(AppRoute.CustomerRequisition)
              .build()}
            labelKey="app.customer-requisition"
            icon={<InvoiceIcon />}
          />
        </Grid>
      </Grid>
      <Grid container justifyContent="center">
        <Typography sx={{ marginTop: 10 }}>
          Note: no design provided yet. The buttons are for convenience.
        </Typography>
      </Grid>
    </Grid>
  );
};

export default CustomerContainer;
