import React from 'react';
import { Property } from 'csstype';
import {
  BookIcon,
  Box,
  DashboardIcon,
  Divider,
  ExternalNavLink,
  List,
  PowerIcon,
  // RadioIcon,
  // ReportsIcon,
  SettingsIcon,
  Theme,
  IconButton,
  styled,
  useDrawer,
  useTranslation,
  AppNavLink,
  useIsMediumScreen,
  useAuthContext,
  useLocation,
  EnvUtils,
  CustomersIcon,
} from '@openmsupply-client/common';
import { AppRoute, ExternalURL } from '@openmsupply-client/config';
import {
  CatalogueNav,
  DistributionNav,
  InventoryNav,
  ReplenishmentNav,
} from '../Navigation';
import { AppDrawerIcon } from './AppDrawerIcon';

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
  marginLeft: 8,
  width: 152,
});

const drawerWidth = 240;

const getDrawerCommonStyles = (theme: Theme) => ({
  backgroundColor: theme.palette.background.drawer,
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
  height: '100%',
  borderRadius: '0 8px 8px 0',
  overflow: 'hidden',
  boxShadow: theme.shadows[7],
  zIndex: theme.zIndex.drawer,
  '& .MuiSvgIcon-root': {
    color: theme.mixins.drawer?.iconColor,
  },
  '& .navLinkText .MuiTypography-root': {
    color: theme.mixins.drawer?.textColor,
  },
  ...(isOpen && {
    ...openedMixin(theme),
    '& .MuiDrawer-paper': openedMixin(theme),
    '& .navLinkText': {
      display: 'inline-flex',
      flex: 1,
    },
    '& div > ul > li': {
      width: 200,
    },
  }),
  ...(!isOpen && {
    ...closedMixin(theme),
    '& .MuiDrawer-paper': closedMixin(theme),
    '& .navLinkText': {
      display: 'none',
    },
    '& div > ul > li': {
      width: 40,
    },
  }),
}));

export const AppDrawer: React.FC = () => {
  const t = useTranslation('app');
  const isMediumScreen = useIsMediumScreen();
  const drawer = useDrawer();
  const { logout } = useAuthContext();
  const location = useLocation();

  React.useEffect(() => {
    if (drawer.hasUserSet) return;
    if (isMediumScreen && drawer.isOpen) drawer.close();
    if (!isMediumScreen && !drawer.isOpen) drawer.open();
  }, [isMediumScreen]);

  const onHoverOut = () => {
    if (!drawer.hoverOpen) return;

    drawer.close();
    drawer.setHoverOpen(false);
  };

  const onHoverOver = () => {
    if (drawer.isOpen) return;

    drawer.open();
    drawer.setHoverOpen(true);
  };

  const docsUrl = `${ExternalURL.PublicDocs}${
    EnvUtils.mapRoute(location.pathname).docs
  }`;

  return (
    <StyledDrawer
      data-testid="drawer"
      aria-expanded={drawer.isOpen}
      isOpen={drawer.isOpen}
    >
      <ToolbarIconContainer>
        <IconButton
          label={t(
            drawer.isOpen ? 'button.close-the-menu' : 'button.open-the-menu'
          )}
          onClick={drawer.toggle}
          icon={<AppDrawerIcon />}
          sx={{ '&:hover': { backgroundColor: 'inherit' } }}
        />
      </ToolbarIconContainer>
      <UpperListContainer onMouseEnter={onHoverOver} onMouseLeave={onHoverOut}>
        <List>
          <AppNavLink
            to={AppRoute.Dashboard}
            icon={<DashboardIcon fontSize="small" color="primary" />}
            text={t('dashboard')}
          />
          <DistributionNav />
          <ReplenishmentNav />
          <CatalogueNav />
          <InventoryNav />

          <AppNavLink
            to={AppRoute.Patients}
            icon={<CustomersIcon fontSize="small" color="primary" />}
            text={t('patients')}
          />

          {/* <AppNavLink
            to={AppRoute.Tools}
            icon={<ToolsIcon fontSize="small" color="primary" />}
            text={t('tools')}
          /> */}
          {/* <AppNavLink
            to={AppRoute.Reports}
            icon={<ReportsIcon fontSize="small" color="primary" />}
            text={t('reports')}
          /> */}
          {/* <AppNavLink
            to={AppRoute.Messages}
            icon={<MessagesIcon fontSize="small" color="primary" />}
            text={t('messages')}
          /> */}
        </List>
      </UpperListContainer>
      <LowerListContainer>
        <List>
          {drawer.isOpen && <StyledDivider color="drawerDivider" />}
          {/* <AppNavLink
            to={AppRoute.Sync}
            icon={<RadioIcon fontSize="small" color="primary" />}
            text={t('sync')}
          /> */}
          <ExternalNavLink
            to={docsUrl}
            icon={<BookIcon fontSize="small" color="primary" />}
            text={t('docs')}
            trustedSite={true}
          />
          <AppNavLink
            to={AppRoute.Admin}
            icon={<SettingsIcon fontSize="small" color="primary" />}
            text={t('admin')}
          />
          <AppNavLink
            to={AppRoute.Login}
            icon={<PowerIcon fontSize="small" color="primary" />}
            text={t('logout')}
            onClick={logout}
          />
        </List>
      </LowerListContainer>
    </StyledDrawer>
  );
};

export default AppDrawer;
