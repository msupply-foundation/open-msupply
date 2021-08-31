import React, { FC } from 'react';

import clsx from 'clsx';
import { ListItem, ListItemText, Tooltip } from '@material-ui/core';
import makeStyles from '@material-ui/styles/makeStyles';
import { useMatch, Link } from 'react-router-dom';
import { useDrawer } from '../../hooks/useDrawer';

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

const useSelectedNavMenuItem = (to: string, end: boolean): boolean => {
  // This nav menu item should be selected when lower level elements
  // are selected. For example, the route /customer-invoices/{id} should
  // highlight the nav menu item for customer-invoices.
  const highlightLowerLevels = !end || to.endsWith('*');

  // If we need to highlight the higher levels append a wildcard to the match path.
  const path = highlightLowerLevels ? to : `${to}/*`;

  const selected = useMatch({ path });
  return !!selected;
};

export const AppNavLink: FC<ListItemLinkProps> = props => {
  const classes = useStyles();
  const { end, icon = <span style={{ width: 2 }} />, text, to } = props;
  const drawer = useDrawer();
  const selected = useSelectedNavMenuItem(to, !!end);

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
      <Tooltip disableHoverListener={drawer.isOpen} title={text || ''}>
        <ListItem
          selected={selected}
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
