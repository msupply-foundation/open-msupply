import React from 'react';
import {
  Customers,
  Dashboard,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemText,
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
  ReactRouterLink,
  useMatch,
} from '@openmsupply-client/common';

import clsx from 'clsx';

import { Theme } from '@openmsupply-client/common/src/styles/theme';

const useStyles = makeStyles((theme: Theme) => ({
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
    margin: '16px 0',
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
    '& li': { height: 45, display: 'flex', alignItems: 'center' },
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

interface ListItemLinkProps {
  classes: Record<string, string>;
  to: string;
  icon: JSX.Element;
  text?: string;
}

const ListItemLink: React.FC<ListItemLinkProps> = props => {
  const selected = useMatch({ path: props.to + '/*' });

  const CustomLink = React.useMemo(
    () =>
      React.forwardRef<HTMLAnchorElement>((linkProps, ref) => (
        <ReactRouterLink ref={ref} to={props.to} {...linkProps} />
      )),
    [props.to]
  );
  const className = clsx(
    props.classes['drawerMenuItem'],
    !!selected && props.classes['drawerMenuItemSelected']
  );

  return (
    <li>
      <ListItem
        selected={!!selected}
        button
        component={CustomLink}
        className={className}
      >
        {props.icon}
        <ListItemText primary={props.text} />
      </ListItem>
    </li>
  );
};

interface MenuProps {
  classes: Record<string, string>;
}
const Menu: React.FC<MenuProps> = ({ classes }) => (
  <div className={classes['drawerMenu']}>
    <List>
      <ListItemLink
        to="dashboard"
        icon={<Dashboard />}
        text="Dashboard"
        classes={classes}
      />
      <ListItemLink
        to="customers"
        icon={<Customers />}
        text="Customers"
        classes={classes}
      />
      <ListItemLink
        to="suppliers"
        icon={<Suppliers />}
        text="Suppliers"
        classes={classes}
      />
      <ListItemLink
        to="stock"
        icon={<Stock />}
        text="Stock"
        classes={classes}
      />
      <ListItemLink
        to="tools"
        icon={<Tools />}
        text="Tools"
        classes={classes}
      />
      <ListItemLink
        to="reports"
        icon={<Reports />}
        text="Reports"
        classes={classes}
      />
      <ListItemLink
        to="messages"
        icon={<Messages />}
        text="Messages"
        classes={classes}
      />
      <ListItemLink
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
      <ListItemLink to="sync" icon={<Radio />} text="Sync" classes={classes} />
      <ListItemLink
        to="admin"
        icon={<Settings />}
        text="Admin"
        classes={classes}
      />
      <ListItemLink
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
