import React from 'react';
import {
  Customers,
  Dashboard,
  Divider,
  Drawer,
  IconButton,
  List,
  MSupplyGuy,
  Messages,
  Power,
  Radio,
  Reports,
  Settings,
  Stock,
  Suppliers,
  Tools,
  makeStyles,
  ReceiptIcon,
  AppNavLink,
  AppTheme,
} from '@openmsupply-client/common';

import clsx from 'clsx';

const useStyles = makeStyles((theme: AppTheme) => ({
  toolbarIcon: {
    display: 'flex',
    height: 90,
    justifyContent: 'center',
    alignItems: 'center',
    padding: '0 8px',
    ...theme.mixins.toolbar,
  },
  drawerMenu: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    justifyContent: 'space-between',
    paddingLeft: 15,
  },
  drawerMenuItem: {
    height: 32,
    margin: '20px 0',
    '& svg': { ...theme.mixins.icon.medium },
    '&:hover': {
      backgroundColor: theme.palette.background?.white,
      boxShadow: theme.shadows[8],
    },
  },
  drawerMenuItemSelected: {
    backgroundColor: `${theme.palette.background?.white}!important`,
    boxShadow: theme.shadows[4],
  },
  drawerPaper: {
    backgroundColor: theme.palette.background?.drawer,
    position: 'relative',
    whiteSpace: 'nowrap',
    width: 200,
    transition: theme.transitions.create('width', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
    borderRadius: 8,
    boxShadow: theme.shadows[7],
    '& li > a': { borderRadius: 16, padding: '4px 8px', width: 168 },
    '& li > a > div': { marginLeft: 8 },
  },
  drawerPaperClose: {
    overflowX: 'hidden',
    transition: theme.transitions.create('width', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    width: theme.spacing(7),
    [theme.breakpoints.up('sm')]: {
      width: theme.spacing(9),
    },
    '& li > a': { borderRadius: 20, height: 40, padding: 10, width: 40 },
    '& li > a > div': { display: 'none' },
    '& ul > hr': { display: 'none' },
  },
  mSupplyGuy: { height: 60, width: 45 },
  mSupplyGuySmall: { height: 40, width: 30 },
}));

interface MenuProps {
  classes: Record<string, string>;
}
const Menu: React.FC<MenuProps> = ({ classes }) => (
  <div className={classes['drawerMenu']}>
    <List>
      <AppNavLink
        to="dashboard"
        icon={<Dashboard />}
        text="Dashboard"
        classes={classes}
      />
      <AppNavLink
        to="customers"
        icon={<Customers />}
        text="Customers"
        classes={classes}
      />
      <AppNavLink
        to="suppliers"
        icon={<Suppliers />}
        text="Suppliers"
        classes={classes}
      />
      <AppNavLink to="stock" icon={<Stock />} text="Stock" classes={classes} />
      <AppNavLink to="tools" icon={<Tools />} text="Tools" classes={classes} />
      <AppNavLink
        to="reports"
        icon={<Reports />}
        text="Reports"
        classes={classes}
      />
      <AppNavLink
        to="messages"
        icon={<Messages />}
        text="Messages"
        classes={classes}
      />
      <AppNavLink
        to="transactions"
        icon={<ReceiptIcon />}
        text="Transactions"
        classes={classes}
      />
    </List>
    <List>
      <Divider
        style={{ backgroundColor: '#555770', marginLeft: 8, width: 152 }}
      />
      <AppNavLink to="sync" icon={<Radio />} text="Stock" classes={classes} />
      <AppNavLink
        to="admin"
        icon={<Settings />}
        text="Admin"
        classes={classes}
      />
      <AppNavLink
        to="logout"
        icon={<Power />}
        text="Logout"
        classes={classes}
      />
    </List>
  </div>
);

interface Drawer {
  open: boolean | null;
  closeDrawer: () => void;
  openDrawer: () => void;
}
interface AppDrawerProps {
  drawer: Drawer;
  open?: boolean;
}

const AppDrawer: React.FC<AppDrawerProps> = props => {
  const classes = useStyles();
  const { drawer } = props;

  const toggleDrawer = () => {
    if (!!drawer.open) drawer.closeDrawer();
    else drawer.openDrawer();
  };

  return (
    <Drawer
      variant="permanent"
      classes={{
        paper: clsx(
          classes.drawerPaper,
          !props.drawer.open && classes.drawerPaperClose
        ),
      }}
      open={props.open}
    >
      <div className={classes.toolbarIcon}>
        <IconButton onClick={toggleDrawer}>
          <MSupplyGuy
            onClick={toggleDrawer}
            classes={{
              root: drawer.open ? classes.mSupplyGuy : classes.mSupplyGuySmall,
            }}
          />
        </IconButton>
      </div>
      <Menu classes={classes} />
    </Drawer>
  );
};

export default AppDrawer;
