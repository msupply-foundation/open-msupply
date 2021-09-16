import React from 'react';
import {
  Box,
  Dashboard,
  Divider,
  List,
  MSupplyGuy,
  Messages,
  Power,
  Radio,
  Reports,
  Settings,
  Stock,
  Suppliers,
  Theme,
  Tools,
  UnstyledIconButton,
  styled,
  useDrawer,
  useTranslation,
  NavLink,
  useIsMediumScreen,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { Property } from 'csstype';

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

const commonListContainerStyles = {
  display: 'flex',
  flexDirection: 'column' as Property.FlexDirection,
  justifyContent: 'space-between',
  alignItems: 'center',
};

const LowerListContainer = styled(Box)({
  ...commonListContainerStyles,
  height: 151,
  position: 'static',
  bottom: 0,
});

const UpperListContainer = styled(Box)({
  ...commonListContainerStyles,
  flex: 1,
  height: '100%',
  msOverflowStyle: 'none',
  overflow: 'scroll',
  scrollbarWidth: 'none',
  '&::-webkit-scrollbar': {
    display: 'none',
  },
});

const StyledDivider = styled(Divider)({
  backgroundColor: '#555770',
  marginLeft: 8,
  width: 152,
});

const drawerWidth = 200;

const getDrawerCommonStyles = (theme: Theme) => ({
  backgroundColor: theme.palette.background.menu,
  overflow: 'hidden',
});

const openedMixin = (theme: Theme) => ({
  ...getDrawerCommonStyles(theme),
  width: drawerWidth,

  transition: theme.transitions.create('width', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.enteringScreen,
  }),
});

const closedMixin = (theme: Theme) => ({
  ...getDrawerCommonStyles(theme),

  transition: theme.transitions.create('width', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  [theme.breakpoints.up('sm')]: {
    width: theme.spacing(10),
  },
});

const StyledDrawer = styled(Box, {
  shouldForwardProp: prop => prop !== 'isOpen',
})<{ isOpen: boolean }>(({ isOpen, theme }) => ({
  height: '100vh',
  flexGrow: 0,
  borderRadius: 8,
  overflow: 'hidden',
  boxShadow: theme.shadows[7],
  zIndex: 2,
  ...(isOpen && {
    ...openedMixin(theme),
    '& .MuiDrawer-paper': openedMixin(theme),
  }),
  ...(!isOpen && {
    ...closedMixin(theme),
    '& .MuiDrawer-paper': closedMixin(theme),
  }),
}));

const AppDrawer: React.FC = () => {
  const t = useTranslation();
  const isMediumScreen = useIsMediumScreen();

  const drawer = useDrawer();

  React.useEffect(() => {
    if (drawer.hasUserSet) return;
    if (isMediumScreen && drawer.isOpen) drawer.close();
    if (!isMediumScreen && !drawer.isOpen) drawer.open();
  }, [isMediumScreen]);

  return (
    <StyledDrawer
      data-testid="drawer"
      aria-expanded={drawer.isOpen}
      isOpen={drawer.isOpen}
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
      <UpperListContainer>
        <List>
          <NavLink
            to={AppRoute.Dashboard}
            icon={<Dashboard fontSize="small" />}
            text={t('app.dashboard')}
          />
          <React.Suspense fallback={null}>
            <CustomersNav />
          </React.Suspense>
          <NavLink
            to={AppRoute.Suppliers}
            icon={<Suppliers fontSize="small" />}
            text={t('app.suppliers')}
          />
          <NavLink
            to={AppRoute.Stock}
            icon={<Stock fontSize="small" />}
            text={t('app.stock')}
          />
          <NavLink
            to={AppRoute.Tools}
            icon={<Tools fontSize="small" />}
            text={t('app.tools')}
          />
          <NavLink
            to={AppRoute.Reports}
            icon={<Reports fontSize="small" />}
            text={t('app.reports')}
          />
          <NavLink
            to={AppRoute.Messages}
            icon={<Messages fontSize="small" />}
            text={t('app.messages')}
          />
        </List>
      </UpperListContainer>
      <LowerListContainer>
        <List>
          {drawer.isOpen && <StyledDivider />}
          <NavLink to={AppRoute.Sync} icon={<Radio />} text={t('app.sync')} />
          <NavLink
            to={AppRoute.Admin}
            icon={<Settings />}
            text={t('app.admin')}
          />
          <NavLink
            to={AppRoute.Logout}
            icon={<Power />}
            text={t('app.logout')}
          />
        </List>
      </LowerListContainer>
    </StyledDrawer>
  );
};

export default AppDrawer;
