import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Book,
  Button,
  styled,
  Toolbar,
  useDrawer,
  useHostContext,
  Box,
  UnstyledIconButton,
  Breadcrumbs,
} from '@openmsupply-client/common';
import { LanguageMenu } from './LanguageMenu';

const ButtonContainer = styled('div')({
  display: 'flex',
  flex: 1,
  justifyContent: 'flex-end',
});

const StyledContainer = styled(Box, {
  shouldForwardProp: prop => prop !== 'isOpen',
})<{ isOpen: boolean }>(({ isOpen, theme }) => ({
  marginLeft: 80,
  marginRight: 0,
  minHeight: 90,
  zIndex: theme.zIndex.drawer - 1,
  boxShadow: theme.shadows[1],

  transition: theme.transitions.create(['width', 'margin'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),

  ...(isOpen && {
    marginLeft: 200,
    transition: theme.transitions.create(['width', 'margin'], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
  }),
}));

const AppBar: React.FC = () => {
  const { isOpen } = useDrawer();
  const { appBarButtonsRef, appBarExtra } = useHostContext();
  const navigate = useNavigate();

  return (
    <StyledContainer isOpen={isOpen}>
      <Toolbar disableGutters>
        <UnstyledIconButton
          icon={<ArrowLeft />}
          titleKey="button.go-back"
          onClick={() => navigate(-1)}
        />

        <Breadcrumbs />
        <ButtonContainer ref={appBarButtonsRef}>
          <Button
            icon={<Book />}
            labelKey="button.docs"
            onClick={() => (location.href = 'https://docs.msupply.foundation')}
          />
          <LanguageMenu />
        </ButtonContainer>
      </Toolbar>
      <ButtonContainer ref={appBarExtra} />
    </StyledContainer>
  );
};

export default AppBar;
