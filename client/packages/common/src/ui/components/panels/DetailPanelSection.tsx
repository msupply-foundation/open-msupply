import React from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  styled,
  Typography,
} from '@mui/material';
import { Divider } from '../..';
import { LocaleKey, useTranslation } from '../../../intl/intlHelpers';
import { ChevronDownIcon } from '../../icons';

const StyledAccordion = styled(Accordion)(({ theme }) => ({
  backgroundColor: theme.palette.background.menu,
  boxShadow: 'none',
  '&.Mui-expanded': { margin: 0 },
  '&:before': { backgroundColor: 'transparent' },
  '& p.MuiTypography-root': { fontSize: 12 },
}));

export interface DetailPanelSectionProps {
  titleKey: LocaleKey;
}

export const DetailPanelSection: React.FC<DetailPanelSectionProps> = ({
  children,
  titleKey,
}) => {
  const t = useTranslation();
  return (
    <Box>
      <StyledAccordion>
        <AccordionSummary expandIcon={<ChevronDownIcon />}>
          <Typography sx={{ fontWeight: 'bold' }}>{t(titleKey)}</Typography>
        </AccordionSummary>
        <AccordionDetails>{children}</AccordionDetails>
      </StyledAccordion>
      <Divider />
    </Box>
  );
};
