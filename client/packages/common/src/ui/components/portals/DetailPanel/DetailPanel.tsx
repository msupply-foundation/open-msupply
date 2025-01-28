import React, {
  FC,
  PropsWithChildren,
  ReactNode,
  useEffect,
  useRef,
} from 'react';
import { Box, Grid, Portal, Theme, Typography, styled } from '@mui/material';
import {
  useDetailPanelStore,
  useHostContext,
  useIsLargeScreen,
} from '@common/hooks';
import { useTranslation } from '@common/intl';
import { FlatButton } from '../../buttons';
import { CloseIcon } from '@common/icons';
import { Divider } from '../../divider/Divider';
import { LocalStorage } from '../../../../localStorage';

export interface DetailPanelPortalProps {
  Actions?: ReactNode;
}

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
  height: '100%',
  overflow: 'hidden',
  zIndex: theme.zIndex.drawer,
  boxShadow: theme.shadows[7],
  ...(isOpen && openedMixin(theme)),
  ...(!isOpen && closedMixin(theme)),
}));

export const DetailPanel: FC = () => {
  const { setDetailPanelRef } = useHostContext();
  const { isOpen } = useDetailPanelStore();
  const ref = useRef(null);

  useEffect(() => {
    setDetailPanelRef(ref);
  }, []);

  return <StyledDrawer data-testid="detail-panel" isOpen={isOpen} ref={ref} />;
};

export const DetailPanelPortal: FC<
  PropsWithChildren<DetailPanelPortalProps>
> = ({ Actions, children }) => {
  const t = useTranslation();
  const { detailPanelRef } = useHostContext();
  const { hasUserSet, isOpen, close } = useDetailPanelStore();
  const isLargeScreen = useIsLargeScreen();

  const setIsOpen = (isOpen: boolean) =>
    useDetailPanelStore.setState(state => ({
      ...state,
      isOpen,
      shouldPersist: false,
    }));

  React.useEffect(() => {
    if (!hasUserSet) {
      if (isLargeScreen && isOpen) setIsOpen(false);
      if (!isLargeScreen && !isOpen) setIsOpen(true);
    }
  }, [isLargeScreen, hasUserSet, isOpen]);

  React.useEffect(() => {
    if (hasUserSet && !isOpen) {
      setIsOpen(!!LocalStorage.getItem('/detailpanel/open'));
    }
    // set isOpen to false on unmounting, so that the open state
    // is controlled by the portal and only shown if there is content
    return () => setIsOpen(false);
  }, []);

  if (!detailPanelRef) return null;

  return (
    <Portal container={detailPanelRef.current}>
      <Grid container flexDirection="column" sx={{ height: '100%' }}>
        <Grid item>
          <Box
            sx={{
              alignItems: 'center',
              color: 'gray.main',
              display: 'flex',
              height: 56,
              justifyContent: 'flex-end',
            }}
          >
            <FlatButton
              color="inherit"
              label={t('button.close')}
              onClick={close}
              startIcon={<CloseIcon color="inherit" />}
            />
          </Box>
        </Grid>
        <Grid item flex={1} style={{ overflowY: 'scroll' }}>
          <Divider />
          {children}
        </Grid>
        <Grid item>
          <Box>
            {Actions ? (
              <Box sx={{ marginBottom: 2 }}>
                <Divider />
                <Typography
                  sx={{
                    fontSize: 12,
                    fontWeight: 600,
                    marginTop: '15px',
                    marginBottom: '10px',
                    marginInlineStart: '15px',
                  }}
                >
                  {t('heading.actions')}
                </Typography>
                {Actions}
              </Box>
            ) : null}
          </Box>
        </Grid>
      </Grid>
    </Portal>
  );
};
