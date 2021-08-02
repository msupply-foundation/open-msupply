import React from 'react';
import {
  makeStyles,
  IconButton,
  MenuIcon,
  Toolbar,
  Typography,
} from '@openmsupply-client/common';
import clsx from 'clsx';
import { useServiceContext } from './Service';

const useStyles = makeStyles(theme => ({
  toolbar: {
    paddingRight: 24,
  },
  appBar: {
    position: 'absolute',
    zIndex: theme.zIndex.drawer + 1,
    transition: theme.transitions.create(['width', 'margin'], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
  },
  appBarShift: {
    marginLeft: 200,
    width: `calc(100% - 200px)`,
    transition: theme.transitions.create(['width', 'margin'], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
  },
  menuButton: {
    marginRight: 36,
  },
  menuButtonHidden: {
    display: 'none',
  },
  title: {
    flexGrow: 1,
  },
}));

interface Drawer {
  open: boolean | null;
  openDrawer: () => void;
  closeDrawer: () => void;
}
interface AppBarProps {
  drawer: Drawer;
}

const AppBar: React.FC<AppBarProps> = props => {
  const classes = useStyles();
  const serviceContext = useServiceContext();

  return (
    <div
      className={clsx(classes.appBar, props.drawer.open && classes.appBarShift)}
    >
      <Toolbar className={classes.toolbar}>
        <IconButton
          edge="start"
          color="inherit"
          aria-label="open drawer"
          onClick={props.drawer.openDrawer}
          className={clsx(
            classes.menuButton,
            props.drawer.open && classes.menuButtonHidden
          )}
        >
          <MenuIcon />
        </IconButton>
        <Typography
          component="h1"
          variant="h6"
          color="inherit"
          noWrap
          className={classes.title}
        >
          {serviceContext.title}
        </Typography>
      </Toolbar>
    </div>
  );
};
export default AppBar;
