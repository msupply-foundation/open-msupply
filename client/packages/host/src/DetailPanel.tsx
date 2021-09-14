import React, { useCallback } from 'react';
import {
  Box,
  Close,
  Theme,
  FlatButton,
  styled,
  useDetailPanelStore,
  useTranslation,
  Typography,
  ChevronDown,
  useTheme,
  useMediaQuery,
} from '@openmsupply-client/common';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
} from '@material-ui/core';

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
  const { close, isOpen, open, sections } = useDetailPanelStore();
  const t = useTranslation();
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('lg'));

  const Sections = useCallback(
    () => (
      <>
        {sections.map(section => (
          <Box key={section.titleKey}>
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

  React.useEffect(() => {
    if (isSmallScreen && isOpen) close();
    if (!isSmallScreen && !isOpen) open();
  }, [isSmallScreen]);

  if (!sections.length) return null;

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
      <Sections />
    </StyledDrawer>
  );
};

export default DetailPanel;
