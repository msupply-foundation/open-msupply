import React from 'react';
import { CircularProgress, makeStyles, Paper, Box } from '@openmsupply-client/common';

const useStyles = makeStyles((theme) => ({
  paper: {
    padding: theme.spacing(2),
    display: 'flex',
    overflow: 'auto',
  },
}));

const Loading = () => (
  <Box display="flex" flex={1} justifyContent="center" alignItems="center">
    <CircularProgress />
  </Box>
);

const Widget = (props) => {
  const classes = useStyles();
  return (
    <Paper style={{ height: props.height }} className={classes.paper}>
      <React.Suspense fallback={<Loading />}>{props.children}</React.Suspense>
    </Paper>
  );
};

export default Widget;
