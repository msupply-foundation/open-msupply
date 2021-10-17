import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  styled,
  AppBarContent,
  Toolbar,
  Box,
  IconButton,
  Breadcrumbs,
  useAppBarRect,
  AppBarButtons,
} from '@openmsupply-client/common';

const StyledContainer = styled(Box)(({ theme }) => ({
  marginRight: 0,
  minHeight: 90,
  paddingLeft: '16px',
  paddingRight: '16px',

  boxShadow: theme.shadows[1],
  ...theme.mixins.header,
}));

const AppBar: React.FC = () => {
  const navigate = useNavigate();
  const { ref } = useAppBarRect();

  return (
    <StyledContainer ref={ref}>
      <Toolbar disableGutters>
        <IconButton
          icon={<ArrowLeft />}
          labelKey="button.go-back"
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
