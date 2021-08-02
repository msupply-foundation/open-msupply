import React from 'react';
import {
  Customers,
  Dashboard,
  Drawer,
  List,
  ListItem,
  ListItemText,
  MSupplyGuy,
  Messages,
  Reports,
  Stock,
  Suppliers,
  Tools,
  makeStyles,
} from '@openmsupply-client/common';

import clsx from 'clsx';

import { Link, useMatch } from 'react-router-dom';
import { Theme } from '@openmsupply-client/common/src/styles/theme';

const useStyles = makeStyles((theme: Theme) => ({
  toolbarIcon: {
    display: 'flex',
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    padding: '0 8px',
    ...theme.mixins.toolbar,
  },
  drawerMenu: { paddingLeft: 15 },
  drawerMenuItem: {
    height: 32,
    margin: '20px 0',
    padding: '4px 8px',
    width: 168,
    '& > svg': {
      height: 20,
      marginRight: 8,
      width: 20,
    },
    '&:hover': {
      backgroundColor: '#fff',
      borderRadius: 16,
      boxShadow:
        '0 8px 16px 0 rgb(96 97 112 / 16%), 0 2px 4px 0 rgb(40 41 61 / 4%)',
    },
  },
  drawerMenuItemSelected: {
    backgroundColor: '#fff!important',
    borderRadius: 16,
    boxShadow:
      '0 8px 16px 0 rgb(96 97 112 / 16%), 0 2px 4px 0 rgb(40 41 61 / 4%)',
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
    boxShadow: '0 4px 8px 0 rgba(0, 0, 0, 0.32), 0 0 2px 0 rgba(0, 0, 0, 0.04)',
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
  const selected = useMatch(props.to);
  const CustomLink = React.useMemo(
    () =>
      React.forwardRef<HTMLAnchorElement>((linkProps, ref) => (
        <Link ref={ref} to={props.to} {...linkProps} />
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
  <List className={classes['drawerMenu']}>
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
    <ListItemLink to="stock" icon={<Stock />} text="Stock" classes={classes} />
    <ListItemLink to="tools" icon={<Tools />} text="Tools" classes={classes} />
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
  </List>
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
        <MSupplyGuy
          onClick={props.drawer.closeDrawer}
          classes={{
            root: drawer.open ? classes.mSupplyGuy : classes.mSupplyGuySmall,
          }}
        />
      </div>
      <Menu classes={classes} />
    </Drawer>
  );
};

export default AppDrawer;
