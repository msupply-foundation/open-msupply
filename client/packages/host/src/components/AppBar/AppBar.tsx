import React from 'react';
import {
  styled,
  AppBarContent,
  Toolbar,
  Box,
  Breadcrumbs,
  useAppBarRect,
  AppBarButtons,
  useMatch,
  AppBarTabs,
  useAuthContext,
  Theme,
  useHostContext,
  MinimiseIcon,
  ButtonWithIcon,
  useTranslation,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { SectionIcon } from './SectionIcon';
import { ColdchainNotification } from '@openmsupply-client/coldchain';

const StyledContainer = styled(Box)(({ theme }) => ({
  marginRight: 0,
  minHeight: 90,
  paddingLeft: 16,
  paddingRight: 16,

  ...theme.mixins.header,
}));

export const AppBar: React.FC = () => {
  const t = useTranslation();
  const { ref } = useAppBarRect();
  const isDashboard = useMatch(AppRoute.Dashboard);
  const { store } = useAuthContext();
  const { fullScreen, setFullScreen } = useHostContext();
  const hasVaccineModule = store?.preferences.vaccineModule ?? false;
  const containerStyle = isDashboard
    ? { borderBottom: 0, minHeight: '10px' }
    : { boxShadow: (theme: Theme) => theme.shadows[2] };

  return (
    <>
      <Box display={fullScreen ? 'none' : undefined}>
        {hasVaccineModule && <ColdchainNotification />}
        <StyledContainer ref={ref} sx={containerStyle}>
          {!isDashboard && (
            <Toolbar disableGutters>
              <Box style={{ marginInlineEnd: 5 }}>
                <SectionIcon />
              </Box>
              <Breadcrumbs />
              <AppBarButtons />
            </Toolbar>
          )}
          <AppBarContent />
          {!isDashboard && <AppBarTabs />}
        </StyledContainer>
      </Box>

      {/* Show the exit button in the top right of the page if full screen mode enabled */}
      {fullScreen && (
        <Box
          sx={{
            position: 'absolute',
            right: 10,
            top: 10,
            height: '50px',
            zIndex: 999999,
          }}
        >
          <ButtonWithIcon
            sx={{ minWidth: '0' }}
            variant="outlined"
            Icon={<MinimiseIcon />}
            onClick={() => setFullScreen(false)}
            label={t('label.exit')}
            shrinkThreshold="xl"
          />
        </Box>
      )}
    </>
  );
};

export default AppBar;
