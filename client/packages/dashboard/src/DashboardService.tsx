import React from 'react';
import { Container, Grid, Typography } from '@openmsupply-client/common';
import Widget from './Widget';
import { styled } from '@mui/material/styles';
import Skeleton from '@mui/material/Skeleton';

const RecentInvoiceWidget = () => (
  <Widget>
    <Skeleton variant="text" width="300" animation={false}>
      <Typography variant="h6">Recent Invoices</Typography>
    </Skeleton>
    <Skeleton
      variant="rectangular"
      width="100%"
      height="240"
      animation={false}
    />
  </Widget>
);

const SalesDepositsWidget = () => (
  <Widget>
    <Skeleton variant="text" width="150" animation={false}>
      <Typography variant="h6">Alerts</Typography>
    </Skeleton>
    <Skeleton
      variant="rectangular"
      width="100%"
      height="240"
      animation={false}
    />
  </Widget>
);

const PieWidget = () => (
  <Widget>
    <Skeleton variant="text" width="150" animation={false}>
      <Typography variant="h6">Alerts</Typography>
    </Skeleton>
    <Skeleton variant="text" width="100" animation={false}>
      <Typography variant="h6">Date</Typography>
    </Skeleton>
    <Skeleton variant="circular" height="150" width="150" animation={false} />
  </Widget>
);

const SalesTodayWidget = () => (
  <Widget>
    <Skeleton variant="text" width="300" animation={false}>
      <Typography variant="h6">Purchase Orders</Typography>
    </Skeleton>
    <Skeleton
      variant="rectangular"
      width="100%"
      height="240"
      animation={false}
    />
  </Widget>
);

const Content = styled('main')({
  flexGrow: 1,
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
        <Grid item xs={12} md={8} lg={7}>
          <SalesTodayWidget />
        </Grid>
        <Grid item xs={12} md={4} lg={3}>
          <SalesDepositsWidget />
        </Grid>
        <Grid item xs={12} md={4} lg={2}>
          <PieWidget />
        </Grid>
        <Grid item xs={12}>
          <RecentInvoiceWidget />
        </Grid>
      </Grid>
    </StyledContainer>
  </Content>
);

export default Dashboard;
