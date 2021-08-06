import React, { FC } from 'react';

import clsx from 'clsx';
import { ListItem, ListItemText } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import { useMatch, Link } from 'react-router-dom';

const useStyles = makeStyles(theme => ({
  drawerMenuItem: {
    height: 32,
    margin: '20px 0',
    '& svg': { ...theme.mixins.icon.medium },
    '&:hover': {
      backgroundColor: theme.palette.background.white,
      boxShadow: theme.shadows[8],
    },
  },
  drawerMenuItemSelected: {
    backgroundColor: `${theme.palette.background.white}!important`,
    boxShadow: theme.shadows[4],
  },
}));

interface ListItemLinkProps {
  classes: Record<string, string>;
  to: string;
  icon: JSX.Element;
  text?: string;
}

export const AppNavLink: FC<ListItemLinkProps> = props => {
  const classes = useStyles();
  const selected = useMatch({ path: props.to + '/*' });

  const CustomLink = React.useMemo(
    () =>
      React.forwardRef<HTMLAnchorElement>((linkProps, ref) => (
        <Link ref={ref} to={props.to} {...linkProps} />
      )),
    [props.to]
  );
  const className = clsx(
    classes['drawerMenuItem'],
    !!selected && classes['drawerMenuItemSelected']
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
