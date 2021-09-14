import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Book,
  Button,
  styled,
  AppBarContent,
  Toolbar,
  useHostContext,
  Box,
  UnstyledIconButton,
  Breadcrumbs,
} from '@openmsupply-client/common';
import { LanguageMenu } from './LanguageMenu';
import { ExternalURL } from '@openmsupply-client/config';

const ButtonContainer = styled('div')({
  display: 'flex',
  flex: 1,
  justifyContent: 'flex-end',
});

const StyledContainer = styled(Box)(({ theme }) => ({
  marginRight: 0,
  minHeight: 90,
  paddingLeft: '16px',
  paddingRight: '16px',
  paddingBottom: '16px',
  boxShadow: theme.shadows[1],
  ...theme.mixins.header,
}));

const AppBar: React.FC = () => {
  const { appBarButtonsRef } = useHostContext();
  const navigate = useNavigate();

  return (
    <StyledContainer>
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
            onClick={() => (location.href = ExternalURL.PublicDocs)}
          />
          <LanguageMenu />
        </ButtonContainer>
      </Toolbar>
      <AppBarContent />
    </StyledContainer>
  );
};

export default AppBar;
