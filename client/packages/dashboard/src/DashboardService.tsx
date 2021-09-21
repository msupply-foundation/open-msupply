import React from 'react';
import { Container, Grid, Typography } from '@openmsupply-client/common';
import Widget from './Widget';
import { styled } from '@mui/material/styles';

const RecentInvoiceWidget = () => (
  <Widget height="500px">
    <Typography variant="h6">Recent Invoices</Typography>
  </Widget>
);

const SalesDepositsWidget = () => (
  <Widget height="240px">
    <Typography variant="h6">Alerts</Typography>
  </Widget>
);

const SalesTodayWidget = () => (
  <Widget height="240px">
    <Typography variant="h6">Purchase Orders</Typography>
  </Widget>
);

const Content = styled('main')({
  flexGrow: 1,
  height: '100vh',
  overflow: 'auto',
});

const StyledContainer = styled(Container)(({ theme }) => ({
  paddingTop: theme.spacing(4),
  paddingBottom: theme.spacing(4),
}));

const Dashboard: React.FC = () => (
  <Content>
    <StyledContainer maxWidth="lg">
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
    </StyledContainer>
  </Content>
);

export default Dashboard;
