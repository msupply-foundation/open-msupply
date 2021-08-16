import React from 'react';
import {
  makeStyles,
  Toolbar,
  Typography,
  useDrawer,
  useHostContext,
  useTranslation,
} from '@openmsupply-client/common';
import clsx from 'clsx';
import { LanguageMenu } from './LanguageMenu';

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

const AppBar: React.FC = () => {
  const classes = useStyles();
  const { titleKey } = useHostContext();
  const { isOpen } = useDrawer();
  const t = useTranslation();
  console.log('====>', t('app.dashboard'));

  return (
    <div className={clsx(classes.appBar, isOpen && classes.appBarShift)}>
      <Toolbar className={classes.toolbar}>
        <Typography
          component="h1"
          variant="h6"
          color="inherit"
          noWrap
          className={classes.title}
        >
          {t(titleKey)}
        </Typography>
        <LanguageMenu />
      </Toolbar>
    </div>
  );
};
export default AppBar;
