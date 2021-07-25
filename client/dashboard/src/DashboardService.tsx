import {
  Container,
  Grid,
  makeStyles,
  Typography,
} from '@openmsupply-client/common';
import React from 'react';
import Widget from './Widget';
import { useServiceContext } from 'host/Service';

const RecentInvoiceWidget = () => (
  <Widget height="500px">
    <Typography>RecentInvoices</Typography>
  </Widget>
);

const SalesDepositsWidget = () => (
  <Widget height="240px">
    <Typography>SalesDeposits</Typography>
  </Widget>
);

const SalesTodayWidget = () => (
  <Widget height="240px">
    <Typography>SalesToday</Typography>
  </Widget>
);

const useStyles = makeStyles(theme => ({
  appBarSpacer: theme.mixins.toolbar,
  content: {
    flexGrow: 1,
    height: '100vh',
    overflow: 'auto',
  },
  container: {
    paddingTop: theme.spacing(4),
    paddingBottom: theme.spacing(4),
  },
}));

const Dashboard = () => {
  const classes = useStyles();
  const serviceContext = useServiceContext();
  React.useEffect(() => {
    serviceContext.setService({ title: 'Dashboard' });
  }, []);

  return (
    <main className={classes.content}>
      <div className={classes.appBarSpacer} />
      <Container maxWidth="lg" className={classes.container}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={8} lg={9}>
            <SalesTodayWidget />
          </Grid>
          <Grid item xs={12} md={4} lg={3}>
            <SalesDepositsWidget />
          </Grid>
          <Grid item xs={12}>
            <RecentInvoiceWidget />
          </Grid>
        </Grid>
      </Container>
    </main>
  );
};

export default Dashboard;
