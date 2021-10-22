import React, { FC, ReactNode, useEffect, useRef } from 'react';
import {
  Box,
  Grid,
  Theme,
  Typography,
  styled,
  useMediaQuery,
  useTheme,
  Portal,
} from '@mui/material';
import { useDetailPanelStore, useHostContext } from '../../../../hooks';
import { useTranslation } from '../../../../intl/intlHelpers';
import { FlatButton } from '../../buttons';
import { CloseIcon } from '../../../icons';
import { Divider } from '../..';

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
  height: '100vh',
  overflow: 'hidden',
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

export const DetailPanelPortal: FC<DetailPanelPortalProps> = ({
  Actions,
  children,
}) => {
  const t = useTranslation();
  const { detailPanelRef } = useHostContext();
  const { close, isOpen, open } = useDetailPanelStore();
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('lg'));

  if (!detailPanelRef) return null;

  useEffect(() => {
    if (isSmallScreen && isOpen) close();
    if (!isSmallScreen && !isOpen) open();
    return () => close();
  }, [isSmallScreen]);

  return (
    <Portal container={detailPanelRef.current}>
      <Grid container flexDirection="column" sx={{ height: '100%' }}>
        <Grid item>
          <Box
            sx={{
              alignItems: 'center',
              color: 'midGrey',
              display: 'flex',
              height: 56,
              justifyContent: 'flex-end',
            }}
          >
            <FlatButton
              color="inherit"
              labelKey="button.close"
              onClick={close}
              icon={<CloseIcon color="inherit" />}
            />
          </Box>
        </Grid>
        <Grid item flex={1}>
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
                    margin: '15px 0 10px 21px',
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
