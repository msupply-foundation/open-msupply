/**
 * TO-DO: Make into generic component in common
 */

import React, { PropsWithChildren, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  styled,
  Typography,
} from '@mui/material';
import { ChevronDownIcon } from '@common/icons';

const BORDER_RADIUS = 10;

const StyledAccordion = styled(Accordion)(({ theme }) => ({
  backgroundColor: theme.palette.background.menu,
  boxShadow: 'none',
  '&.Mui-expanded': { marginBottom: 2, marginTop: 0 },
  '&:before': { backgroundColor: 'transparent' },
  '& .MuiAccordionSummary-root.Mui-expanded': {
    minHeight: 48,
  },
  '&:first-of-type': {
    borderTopLeftRadius: BORDER_RADIUS,
    borderTopRightRadius: BORDER_RADIUS,
  },
  '&:last-of-type': {
    borderBottomLeftRadius: BORDER_RADIUS,
    borderBottomRightRadius: BORDER_RADIUS,
  },
  width: '100%',
  borderRadius: BORDER_RADIUS,
  '& p.MuiTypography-root': { fontSize: 12 },
  '& .MuiInput-root ': {
    border: '1.5px solid',
    borderColor: theme.palette.gray.main,
    backgroundColor: theme.palette.background.white,
  },
  height: 'fit-content',
}));

export interface DetailPanelSectionProps {
  title?: string;
  closedSummary?: string;
  defaultExpanded?: boolean;
}

export const AccordionPanelSection: React.FC<
  PropsWithChildren<DetailPanelSectionProps>
> = ({ children, title, closedSummary, defaultExpanded = true }) => {
  const [open, setOpen] = useState(defaultExpanded);
  return (
    <StyledAccordion expanded={open} onChange={() => setOpen(!open)}>
      <AccordionSummary expandIcon={<ChevronDownIcon />}>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Typography>
            <strong>{title}</strong>
          </Typography>
          {!open && <Typography>{closedSummary}</Typography>}
        </Box>
      </AccordionSummary>
      <AccordionDetails>{children}</AccordionDetails>
    </StyledAccordion>
  );
};
