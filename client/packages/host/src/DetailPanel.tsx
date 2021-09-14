import React from 'react';
import {
  Box,
  Close,
  Divider,
  Drawer,
  Theme,
  FlatButton,
  styled,
  useDetailPanelStore,
} from '@openmsupply-client/common';

const openedMixin = (theme: Theme) => ({
  // width: 300,
  '& .MuiDrawer-paper': {
    backgroundColor: theme.palette.background.menu,
    width: 300,
  },

  transition: theme.transitions.create('width', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.enteringScreen,
  }),
});

const closedMixin = (theme: Theme) => ({
  transition: theme.transitions.create('width', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
});

const StyledDrawer = styled(Drawer)(({ open, theme }) => {
  return {
    // position: 'absolute',
    // backgroundColor: theme.palette.background.menu,

    whiteSpace: 'nowrap',
    width: 0,
    // borderRadius: 8,
    // overflow: 'hidden',
    boxShadow: theme.shadows[7],
    ...(open && openedMixin(theme)),
    ...(!open && closedMixin(theme)),
  };
});

const StyledDivider = styled(Divider)({
  backgroundColor: '#555770',
  // marginLeft: 8,
  width: 152,
});

const DetailPanel: React.FC = () => {
  const isOpen = useDetailPanelStore(state => state.isOpen);
  const close = useDetailPanelStore(state => state.close);

  return (
    <StyledDrawer
      data-testid="drawer"
      anchor="right"
      aria-expanded={isOpen}
      open={isOpen}
    >
      <Box>
        <FlatButton
          labelKey="button.close"
          onClick={close}
          icon={<Close color="secondary" />}
        />
      </Box>
      <StyledDivider />
    </StyledDrawer>
  );
};

export default DetailPanel;
