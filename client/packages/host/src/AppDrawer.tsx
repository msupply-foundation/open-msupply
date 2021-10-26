import React from 'react';
import {
  Box,
  DashboardIcon,
  Divider,
  List,
  MSupplyGuy,
  PowerIcon,
  RadioIcon,
  ReportsIcon,
  SettingsIcon,
  StockIcon,
  Theme,
  IconButton,
  styled,
  useDrawer,
  useTranslation,
  NavLink,
  useIsMediumScreen,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { Property } from 'csstype';

const DistributionNav = React.lazy(
  () => import('@openmsupply-client/distribution/src/Nav')
);

const ToolbarIconContainer = styled(Box)({
  display: 'flex',
  height: 90,
  justifyContent: 'center',
});

const commonListContainerStyles = {
  alignItems: 'center',
  display: 'flex',
  flexDirection: 'column' as Property.FlexDirection,
};

const LowerListContainer = styled(Box)({
  ...commonListContainerStyles,
});

const UpperListContainer = styled(Box)({
  ...commonListContainerStyles,
  flex: 1,
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

const drawerWidth = 240;

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
  display: 'flex',
  flexDirection: 'column',
  height: '100vh',
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
        <IconButton
          labelKey={
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
            icon={<DashboardIcon fontSize="small" color="primary" />}
            text={t('app.dashboard')}
          />
          <React.Suspense fallback={null}>
            <DistributionNav />
          </React.Suspense>
          {/* <NavLink
            to={AppRoute.Suppliers}
            icon={<SuppliersIcon fontSize="small" color="primary" />}
            text={t('app.suppliers')}
          /> */}
          <NavLink
            to={AppRoute.Stock}
            icon={<StockIcon fontSize="small" color="primary" />}
            text={t('app.stock')}
          />
          {/* <NavLink
            to={AppRoute.Tools}
            icon={<ToolsIcon fontSize="small" color="primary" />}
            text={t('app.tools')}
          /> */}
          <NavLink
            to={AppRoute.Reports}
            icon={<ReportsIcon fontSize="small" color="primary" />}
            text={t('app.reports')}
          />
          {/* <NavLink
            to={AppRoute.Messages}
            icon={<MessagesIcon fontSize="small" color="primary" />}
            text={t('app.messages')}
          /> */}
        </List>
      </UpperListContainer>
      <LowerListContainer>
        <List>
          {drawer.isOpen && <StyledDivider />}
          <NavLink
            to={AppRoute.Sync}
            icon={<RadioIcon fontSize="small" color="primary" />}
            text={t('app.sync')}
          />
          <NavLink
            to={AppRoute.Admin}
            icon={<SettingsIcon fontSize="small" color="primary" />}
            text={t('app.admin')}
          />
          <NavLink
            to={AppRoute.Logout}
            icon={<PowerIcon fontSize="small" color="primary" />}
            text={t('app.logout')}
          />
        </List>
      </LowerListContainer>
    </StyledDrawer>
  );
};

export default AppDrawer;
