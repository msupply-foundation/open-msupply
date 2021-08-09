import React from 'react';
import { makeStyles, Toolbar, Typography } from '@openmsupply-client/common';
import clsx from 'clsx';
import { useServiceContext } from './Service';
import { LanguageMenu } from './LanguageMenu';
import { SupportedLocales } from '../../common/src/intl/intlHelpers';

const useStyles = makeStyles(theme => ({
  toolbar: {
    paddingRight: 24,
  },
  appBar: {
    left: 72,
    position: 'absolute',
    transition: theme.transitions.create(['width', 'margin'], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    width: 'calc(100% - 72px)',
    zIndex: theme.zIndex.drawer + 1,
  },
  appBarShift: {
    marginLeft: 128,
    width: `calc(100% - 200px)`,
    transition: theme.transitions.create(['width', 'margin'], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
  },
  title: {
    flexGrow: 1,
  },
}));

interface Drawer {
  open: boolean | null;
}
interface AppBarProps {
  drawer: Drawer;
  locale: SupportedLocales;
}

const AppBar: React.FC<AppBarProps> = props => {
  const classes = useStyles();
  const serviceContext = useServiceContext();

  return (
    <div
      className={clsx(classes.appBar, props.drawer.open && classes.appBarShift)}
    >
      <Toolbar className={classes.toolbar}>
        <Typography
          component="h1"
          variant="h6"
          color="inherit"
          noWrap
          className={classes.title}
        >
          {serviceContext.title}
        </Typography>
        <LanguageMenu locale={props.locale} />
      </Toolbar>
    </div>
  );
};
export default AppBar;
