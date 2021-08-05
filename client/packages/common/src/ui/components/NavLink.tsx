import React, { FC } from 'react';
import { useMatch, Link } from 'react-router-dom';
import clsx from 'clsx';
import { makeStyles, ListItem, ListItemText } from '@material-ui/core';
import { Theme } from '../../styles/theme';

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

interface ListItemLinkProps {
  classes: Record<string, string>;
  to: string;
  icon: JSX.Element;
  text?: string;
}

export const AppNavLink: FC<ListItemLinkProps> = props => {
  useStyles();
  const selected = useMatch({ path: props.to + '/*' });

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
