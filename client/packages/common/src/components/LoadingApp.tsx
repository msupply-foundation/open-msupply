import React from 'react';
import { CircularProgress, Typography } from './index';
import { makeStyles } from '../components';

const useStyles = makeStyles(theme => ({
  root: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  text: {
    marginTop: theme.spacing(3),
  },
}));

export const LoadingApp: React.FC = () => {
  const classes = useStyles();
  return (
    <div className={classes.root}>
      <CircularProgress />
      <Typography className={classes.text}>Loading...</Typography>
    </div>
  );
};
