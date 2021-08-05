import React, { FC, useEffect } from 'react';
import {
  Customers,
  ReactRouterLink,
  useMatch,
  ListItem,
  ListItemText,
  makeStyles,
  Collapse,
  List,
  useDrawer,
} from '@openmsupply-client/common';
import { Theme } from '@openmsupply-client/common/src/styles/theme';
import clsx from 'clsx';

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
    '& li > a': { borderRadius: 16, width: 168 },
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
  to: string;
  icon?: JSX.Element;
  text?: string;
  size?: 's' | undefined;
  onClick: () => void;
}

const ListItemLink: React.FC<ListItemLinkProps> = props => {
  const classes = useStyles();
  const selected = useMatch({ path: props.to + '/*' });

  const CustomLink = React.useMemo(
    () =>
      React.forwardRef<HTMLAnchorElement>((linkProps, ref) => (
        <ReactRouterLink ref={ref} to={props.to} {...linkProps} />
      )),
    [props.to]
  );
  const className = clsx(
    classes['drawerMenuItem'],
    !!selected && props.size !== 's' && classes['drawerMenuItemSelected']
  );

  return (
    <li onClick={props.onClick}>
      <ListItem
        selected={!!selected && props.size !== 's'}
        button
        component={CustomLink}
        className={className}
      >
        {props.icon}
        <ListItemText
          primary={props.text}
          primaryTypographyProps={{
            style: { fontSize: props.size === 's' ? '12px' : '14px' },
          }}
        />
      </ListItem>
    </li>
  );
};

const Nav: FC = () => {
  const { isOpen } = useDrawer();
  const match = useMatch('customers/*');
  const [expanded, setExpanded] = React.useState(false);

  useEffect(() => {
    setExpanded(!!match);
  }, [match]);

  return (
    <>
      <ListItemLink
        onClick={() => setExpanded(true)}
        to="customers"
        icon={<Customers />}
        text="Customers"
      />
      <Collapse in={expanded && isOpen}>
        <List>
          <ListItemLink
            onClick={() => setExpanded(true)}
            to="/customers/customer-invoice"
            size="s"
            icon={<span style={{ width: 20 }} />}
            text="Customer Invoices"
          />
        </List>
      </Collapse>
    </>
  );
};

export default Nav;
