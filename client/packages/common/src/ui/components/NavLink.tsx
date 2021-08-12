import React, { FC } from 'react';

import clsx from 'clsx';
import { ListItem, ListItemText, Tooltip } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import { useMatch, Link } from 'react-router-dom';

const useStyles = makeStyles(theme => ({
  drawerMenuItem: {
    height: 32,
    marginTop: 20,
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
  end?: boolean; // denotes lowest level menu item, using terminology from useMatch
  icon?: JSX.Element;
  text?: string;
  to: string;
}

export const AppNavLink: FC<ListItemLinkProps> = props => {
  const classes = useStyles();
  const { end, icon = <span style={{ width: 20 }} />, text, to } = props;
  const path = !end || to.endsWith('*') ? to : `${to}/*`;
  const selected = useMatch({ path });

  const CustomLink = React.useMemo(
    () =>
      React.forwardRef<HTMLAnchorElement>((linkProps, ref) => (
        <Link ref={ref} to={to} {...linkProps} />
      )),
    [to]
  );
  const className = clsx(
    classes['drawerMenuItem'],
    !!selected && classes['drawerMenuItemSelected']
  );

  return (
    <li>
      <Tooltip title={text || ''}>
        <ListItem
          selected={!!selected}
          button
          component={CustomLink}
          className={className}
        >
          {icon}
          <ListItemText primary={text} />
        </ListItem>
      </Tooltip>
    </li>
  );
};
