import React, { useCallback } from 'react';
import {
  FlatButton,
  styled,
  Theme,
  Close,
  Box,
  Grid,
  useDetailPanelStore,
  useTranslation,
  Typography,
  ChevronDown,
  useTheme,
  useMediaQuery,
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Link,
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

const ButtonContainer = styled(Box)(({ theme }) => ({
  alignItems: 'center',
  color: theme.palette.midGrey,
  display: 'flex',
  height: 56,
  justifyContent: 'flex-end',
}));

const StyledAccordian = styled(Accordion)(({ theme }) => ({
  backgroundColor: theme.palette.background.menu,
  boxShadow: 'none',
  '&.Mui-expanded': { margin: 0 },
  '&:before': { backgroundColor: 'transparent' },
  '& p.MuiTypography-root': { fontSize: 12 },
}));

const DetailPanel: React.FC = () => {
  const { actions, close, isOpen, open, sections } = useDetailPanelStore();
  const t = useTranslation();
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('lg'));

  const Sections = useCallback(
    () => (
      <>
        {sections.map((section, index) => (
          <Box key={`action.titleKey_${index}`}>
            <StyledAccordian>
              <AccordionSummary expandIcon={<ChevronDown color="secondary" />}>
                <Typography sx={{ fontWeight: 'bold' }}>
                  {t(section.titleKey)}
                </Typography>
              </AccordionSummary>
              <AccordionDetails>{section.children}</AccordionDetails>
            </StyledAccordian>
            <StyledDivider />
          </Box>
        ))}
      </>
    ),
    [sections]
  );

  const Action = styled(Link)({
    color: '#e63535',
    cursor: 'pointer',
    fontSize: 14,
  });
  const Actions = useCallback(
    () =>
      !actions.length ? null : (
        <>
          <StyledDivider />
          <Typography
            sx={{ fontSize: 12, fontWeight: 600, margin: '15px 0 16px 21px' }}
          >
            {t('heading.actions')}
          </Typography>
          {actions.map((action, index) => (
            <Box
              key={`action.titleKey_${index}`}
              sx={{ margin: '0 0 15px 21px' }}
            >
              <Action underline="hover" onClick={action.onClick}>
                {t(action.titleKey)}
              </Action>
            </Box>
          ))}
        </>
      ),
    [actions]
  );

  React.useEffect(() => {
    if (isSmallScreen && isOpen) close();
    if (!isSmallScreen && !isOpen) open();
  }, [isSmallScreen]);

  if (!sections.length && !actions.length) return null;

  return (
    <StyledDrawer
      data-testid="detail-panel"
      aria-expanded={isOpen}
      isOpen={isOpen}
    >
      <Grid container flexDirection="column" sx={{ height: '100%' }}>
        <Grid item>
          <ButtonContainer>
            <FlatButton
              color="inherit"
              labelKey="button.close"
              onClick={close}
              icon={<Close color="inherit" />}
            />
          </ButtonContainer>
        </Grid>
        <Grid item flex={1}>
          <StyledDivider />
          <Sections />
        </Grid>
        <Grid item>
          <Actions />
        </Grid>
      </Grid>
    </StyledDrawer>
  );
};

export default DetailPanel;
