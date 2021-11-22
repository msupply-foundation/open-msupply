import React from 'react';
import { useMatch, useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  styled,
  AppBarContent,
  Toolbar,
  Box,
  IconButton,
  Breadcrumbs,
  useAppBarRect,
  useTranslation,
  AppBarButtons,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';

const StyledContainer = styled(Box)(({ theme }) => ({
  marginRight: 0,
  minHeight: 90,
  paddingLeft: 16,
  paddingRight: 16,

  ...theme.mixins.header,
}));

export const AppBar: React.FC = () => {
  const t = useTranslation('app');
  const navigate = useNavigate();
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
        <IconButton
          icon={<ArrowLeftIcon color="primary" />}
          label={t('button.go-back')}
          onClick={() => navigate(-1)}
        />

        <Breadcrumbs />
        <AppBarButtons />
      </Toolbar>
      <AppBarContent />
    </StyledContainer>
  );
};

export default AppBar;
