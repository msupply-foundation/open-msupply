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
  const { ref } = useAppBarRect();
  const isDashboard = useMatch(AppRoute.Dashboard);
  const { store } = useAuthContext();
  const hasVaccineModule = store?.preferences.vaccineModule ?? false;
  const containerStyle = isDashboard
    ? { borderBottom: 0, minHeight: '10px' }
    : { boxShadow: (theme: Theme) => theme.shadows[2] };

  return (
    <>
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
    </>
  );
};

export default AppBar;
