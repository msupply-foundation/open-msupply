import React from 'react';
import {
  Box,
  Close,
  Theme,
  FlatButton,
  styled,
  useDetailPanelStore,
} from '@openmsupply-client/common';

const openedMixin = (theme: Theme) => ({
  width: 300,
  transition: theme.transitions.create('width', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.enteringScreen,
  }),
});

const closedMixin = (theme: Theme) => ({
  width: 0,
  transition: theme.transitions.create('width', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
});

const StyledDrawer = styled(Box, {
  shouldForwardProp: prop => prop !== 'isOpen',
})<{ isOpen: boolean }>(({ isOpen, theme }) => ({
  backgroundColor: theme.palette.background.menu,
  borderRadius: 8,
  height: '100vh',
  overflow: 'hidden',
  boxShadow: theme.shadows[7],
  ...(isOpen && openedMixin(theme)),
  ...(!isOpen && closedMixin(theme)),
}));

const StyledDivider = () => (
  <div
    style={{
      height: 1,
      backgroundColor: '#e4e4eb', // TODO: pop into theme;
    }}
  />
);

const ButtonContainer = styled(Box)({
  alignItems: 'center',
  color: '#8f90a6',
  display: 'flex',
  height: 56,
  justifyContent: 'flex-end',
});

const DetailPanel: React.FC = () => {
  const isOpen = useDetailPanelStore(state => state.isOpen);
  const close = useDetailPanelStore(state => state.close);

  return (
    <StyledDrawer
      data-testid="detail-panel"
      aria-expanded={isOpen}
      isOpen={isOpen}
    >
      <Box>
        <ButtonContainer>
          <FlatButton
            color="inherit"
            labelKey="button.close"
            onClick={close}
            icon={<Close color="inherit" />}
          />
        </ButtonContainer>
      </Box>
      <StyledDivider />
    </StyledDrawer>
  );
};

export default DetailPanel;
