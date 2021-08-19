import React from 'react';
import {
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
  useTranslation,
  AppNavLink,
  useDrawer,
} from '@openmsupply-client/common';
import clsx from 'clsx';

const CustomersNav = React.lazy(() =>
  process.env['NODE_ENV'] !== 'production'
    ? import('../../customers/src/Nav')
    : import('customers/Nav')
);

const useStyles = makeStyles(theme => ({
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
      backgroundColor: theme.palette.background.white,
      boxShadow: theme.shadows[8],
    },
  },
  drawerMenuItemSelected: {
    backgroundColor: `${theme.palette.background.white}!important`,
    boxShadow: theme.shadows[4],
  },
  drawerPaper: {
    backgroundColor: theme.palette.background.drawer,
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

interface MenuProps {
  classes: Record<string, string>;
}
const Menu: React.FC<MenuProps> = ({ classes }) => {
  const t = useTranslation();
  return (
    <div className={classes['drawerMenu']}>
      <List>
        <AppNavLink
          to="dashboard"
          icon={<Dashboard />}
          text={t('app.dashboard')}
        />
        <React.Suspense fallback={null}>
          <CustomersNav />
        </React.Suspense>
        <AppNavLink
          to="suppliers"
          icon={<Suppliers />}
          text={t('app.suppliers')}
        />
        <AppNavLink to="stock" icon={<Stock />} text={t('app.stock')} />
        <AppNavLink to="tools" icon={<Tools />} text={t('app.tools')} />
        <AppNavLink to="reports" icon={<Reports />} text={t('app.reports')} />
        <AppNavLink
          to="messages"
          icon={<Messages />}
          text={t('app.messages')}
        />
      </List>
      <List>
        <Divider
          style={{ backgroundColor: '#555770', marginLeft: 8, width: 152 }}
        />
        <AppNavLink to="sync" icon={<Radio />} text={t('app.sync')} />
        <AppNavLink to="admin" icon={<Settings />} text={t('app.admin')} />
        <AppNavLink to="logout" icon={<Power />} text={t('app.logout')} />
      </List>
    </div>
  );
};

const AppDrawer: React.FC = () => {
  const classes = useStyles();
  const drawer = useDrawer();
  const t = useTranslation();

  return (
    <Drawer
      data-testid="drawer"
      variant="permanent"
      aria-expanded={drawer.isOpen}
      classes={{
        paper: clsx(
          classes.drawerPaper,
          !drawer.isOpen && classes.drawerPaperClose
        ),
      }}
      open={drawer.isOpen}
    >
      <div className={classes.toolbarIcon}>
        <IconButton
          aria-label={t('button.open-the-menu')}
          onClick={drawer.toggle}
        >
          <MSupplyGuy
            classes={{
              root: drawer.isOpen
                ? classes.mSupplyGuy
                : classes.mSupplyGuySmall,
            }}
          />
        </IconButton>
      </div>
      <Menu classes={classes} />
    </Drawer>
  );
};

export default AppDrawer;
