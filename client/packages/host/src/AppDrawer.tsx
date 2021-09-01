import React from 'react';
import {
  Dashboard,
  Divider,
  Drawer,
  UnstyledIconButton,
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
  useTranslation,
  useDrawer,
  useMediaQuery,
  useTheme,
  styled,
  Box,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { AppNavLink } from '@openmsupply-client/common/src/ui/components/NavLink';
import * as CSS from 'csstype';

const CustomersNav = React.lazy(
  () => import('@openmsupply-client/customers/src/Nav')
);

const ToolbarIconContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  height: 90,
  justifyContent: 'center',
  alignItems: 'center',
  padding: '0 8px',
  ...theme.mixins.toolbar,
}));

const ListContainer = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  justifyContent: 'space-between',
});

const StyledDivider = styled(Divider)({
  backgroundColor: '#555770',
  marginLeft: 8,
  width: 152,
});

const drawerWidth = 200;
const gutterSize = 24;

const openedMixin = theme => ({
  boxSizing: 'border-box' as CSS.Property.BoxSizing,
  width: drawerWidth,
  overflow: 'hidden',
  paddingLeft: gutterSize,
  paddingRight: gutterSize,
  transition: theme.transitions.create('width', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.enteringScreen,
  }),
});

const closedMixin = theme => ({
  boxSizing: 'border-box' as CSS.Property.BoxSizing,
  paddingLeft: gutterSize,
  paddingRight: gutterSize,
  transition: theme.transitions.create('width', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  overflow: 'hidden',
  [theme.breakpoints.up('sm')]: {
    width: theme.spacing(10),
  },
});

const StyledDrawer = styled(Drawer)(({ open, theme }) => {
  return {
    backgroundColor: theme.palette.background.menu,
    position: 'relative',
    whiteSpace: 'nowrap',
    borderRadius: 8,
    overflow: 'hidden',
    boxShadow: theme.shadows[7],

    ...(open && {
      ...openedMixin(theme),
      '& .MuiDrawer-paper': openedMixin(theme),
    }),
    ...(!open && {
      ...closedMixin(theme),
      '& .MuiDrawer-paper': closedMixin(theme),
    }),
  };
});

const AppDrawer: React.FC = () => {
  const theme = useTheme();
  const t = useTranslation();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('lg'));
  const drawer = useDrawer();

  React.useEffect(() => {
    if (drawer.hasUserSet) return;
    if (isSmallScreen && drawer.isOpen) drawer.close();
    if (!isSmallScreen && !drawer.isOpen) drawer.open();
  }, [isSmallScreen]);

  return (
    <StyledDrawer
      data-testid="drawer"
      variant="permanent"
      aria-expanded={drawer.isOpen}
      open={drawer.isOpen}
    >
      <ToolbarIconContainer>
        <UnstyledIconButton
          titleKey={
            drawer.isOpen ? 'button.close-the-menu' : 'button.open-the-menu'
          }
          onClick={drawer.toggle}
          icon={<MSupplyGuy size={drawer.isOpen ? 'large' : 'medium'} />}
        />
      </ToolbarIconContainer>
      <ListContainer>
        <List>
          <AppNavLink
            to={AppRoute.Dashboard}
            icon={<Dashboard />}
            text={t('app.dashboard')}
          />
          <React.Suspense fallback={null}>
            <CustomersNav />
          </React.Suspense>
          <AppNavLink
            to={AppRoute.Suppliers}
            icon={<Suppliers />}
            text={t('app.suppliers')}
          />
          <AppNavLink
            to={AppRoute.Stock}
            icon={<Stock />}
            text={t('app.stock')}
          />
          <AppNavLink
            to={AppRoute.Tools}
            icon={<Tools />}
            text={t('app.tools')}
          />
          <AppNavLink
            to={AppRoute.Reports}
            icon={<Reports />}
            text={t('app.reports')}
          />
          <AppNavLink
            to={AppRoute.Messages}
            icon={<Messages />}
            text={t('app.messages')}
          />
        </List>
        <List>
          {drawer.isOpen && <StyledDivider />}
          <AppNavLink
            to={AppRoute.Sync}
            icon={<Radio />}
            text={t('app.sync')}
          />
          <AppNavLink
            to={AppRoute.Admin}
            icon={<Settings />}
            text={t('app.admin')}
          />
          <AppNavLink
            to={AppRoute.Logout}
            icon={<Power />}
            text={t('app.logout')}
          />
        </List>
      </ListContainer>
    </StyledDrawer>
  );
};

export default AppDrawer;
