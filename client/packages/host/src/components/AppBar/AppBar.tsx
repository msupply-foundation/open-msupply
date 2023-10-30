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
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { SectionIcon } from './SectionIcon';

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

  return isDashboard ? (
    <StyledContainer ref={ref} sx={{ borderBottom: 0, minHeight: '50px' }}>
      <Toolbar disableGutters>
        <AppBarButtons />
      </Toolbar>
      <AppBarContent />
    </StyledContainer>
  ) : (
    <StyledContainer ref={ref} sx={{ boxShadow: theme => theme.shadows[2] }}>
      <Toolbar disableGutters>
        <Box style={{ marginInlineEnd: 5 }}>
          <SectionIcon />
        </Box>

        <Breadcrumbs />
        <AppBarButtons />
      </Toolbar>
      <AppBarContent />
      <AppBarTabs />
    </StyledContainer>
  );
};

export default AppBar;
