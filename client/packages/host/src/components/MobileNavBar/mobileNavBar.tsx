import * as React from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import Toolbar from '@mui/material/Toolbar';
import { AppDrawerIcon } from '../AppDrawer/AppDrawerIcon';
import { Property } from 'csstype';
import {
  useTheme,
  AppNavLink,
  PowerIcon,
  useTranslation,
  useConfirmationModal,
  useNavigate,
  RouteBuilder,
  useAuthContext,
  List,
  styled,
  ExternalNavLink,
  BookIcon,
  SettingsIcon,
  UserPermission,
  EnvUtils,
  useDrawer,
  Breadcrumbs
} from '@openmsupply-client/common'
import { AppRoute, ExternalURL, useExternalUrl } from 'packages/config/src/routes';
import { SyncNavLink } from '../AppDrawer/SyncNavLink'; import { ColdChainNav } from '../Navigation/ColdChainNav';
;

const commonListContainerStyles = {
  alignItems: 'flex-start',
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

const StyledDrawer = styled(Box, {
  shouldForwardProp: prop => prop !== 'isOpen',
})<{ isOpen: boolean }>(({ isOpen, theme }) => ({
  background: theme.palette.background.drawer,
  position: 'fixed',
  display: isOpen ? 'flex' : 'none',
  flexDirection: "column",
  height: '80%',
  borderRadius: '0 0 8px 8px',
  width: "100%",
  overflow: "hidden",
  boxShadow: theme.shadows[7],
  zIndex: theme.zIndex.drawer,
  padding: '.25em',
  '& .navLinkText': {
    display: 'inline-flex',
    flex: 1,
  },
  '& div > ul > li': {
    width: 220,
  },
  '& .MuiSvgIcon-root': {
    color: theme.mixins.drawer?.iconColor,
  },
  '& .navLinkText .MuiTypography-root': {
    color: theme.mixins.drawer?.textColor,
  },
}));

export const MobileNavBar = () => {
  const drawer = useDrawer();
  const theme = useTheme();
  const t = useTranslation();
  const { logout, userHasPermission, store } = useAuthContext();
  const navigate = useNavigate();

  const handleDrawerToggle = () => {
    drawer.toggle();
  };

  const publicDocsUrl = useExternalUrl(ExternalURL.PublicDocs);
  const docsUrl = `${publicDocsUrl}${EnvUtils.mapRoute(location.pathname).docs
    }`;

  const handleLogout = () => {
    navigate(RouteBuilder.create(AppRoute.Login).build());
    logout();
  };

  const showConfirmation = useConfirmationModal({
    onConfirm: handleLogout,
    message: t('messages.logout-confirm'),
    title: t('heading.logout-confirm'),
  });

  return (
    <Box>
      <AppBar component="nav" position='static' sx={{
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: theme.palette.background.drawer,
      }}>
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 1, color: "black" }}
          >
            {drawer.isOpen ? <CloseIcon /> : <MenuIcon />}
          </IconButton>
        </Toolbar>
        <Breadcrumbs />
        <Box sx={{ p: '10', pl: '25' }}>
          <AppDrawerIcon />
        </Box>
      </AppBar>
      <Divider />
      <StyledDrawer isOpen={drawer.isOpen}>
        <UpperListContainer>
          <List>
            <ColdChainNav store={store} />
          </List>
        </UpperListContainer>
        <Divider />
        <LowerListContainer>
          <List>
            <ExternalNavLink
              to={docsUrl}
              icon={<BookIcon fontSize="small" color="primary" />}
              text={t('docs')}
              trustedSite={true}
            />
            <SyncNavLink />
            <AppNavLink
              to={AppRoute.Settings}
              icon={<SettingsIcon fontSize="small" color="primary" />}
              text={t('settings')}
              visible={userHasPermission(UserPermission.ServerAdmin)}
            />
            <AppNavLink
              to={'#'}
              icon={<PowerIcon fontSize="small" color="primary" />}
              text={t('logout')}
              onClick={() => {
                showConfirmation({});
              }}
            />
          </List>
        </LowerListContainer>
      </StyledDrawer>
    </Box>
  );
}