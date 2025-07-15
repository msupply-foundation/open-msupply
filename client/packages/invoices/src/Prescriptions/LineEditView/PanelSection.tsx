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
  Tooltip,
  Typography,
} from '@mui/material';
import { ChevronDownIcon } from '@common/icons';

const BORDER_RADIUS = 10;

const StyledAccordion = styled(Accordion)(({ theme }) => ({
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
interface ClosedSummaryProps {
  closedSummary?: { displayValue?: string; text: string; tooltip?: string }[];
}

const ClosedSummary = ({ closedSummary }: ClosedSummaryProps) => {
  return (
    <Box>
      {closedSummary?.map((summary, i) => (
        <Box key={i} sx={{ display: 'flex', flexDirection: 'row' }}>
          <Tooltip title={summary?.tooltip}>
            <Typography sx={{ whiteSpace: 'pre-wrap' }}>
              {summary.displayValue}
            </Typography>
          </Tooltip>
          <Typography>{summary.text}</Typography>
        </Box>
      ))}
    </Box>
  );
};

export interface DetailPanelSectionProps {
  backgroundColor?: string;
  title?: string;
  closedSummary?: { displayValue?: string; text: string; tooltip?: string }[];
  defaultExpanded?: boolean;
}

export const AccordionPanelSection: React.FC<
  PropsWithChildren<DetailPanelSectionProps>
> = ({
  children,
  title,
  closedSummary,
  defaultExpanded = true,
  backgroundColor = 'background.menu',
}) => {
  const [open, setOpen] = useState(defaultExpanded);
  return (
    <StyledAccordion
      expanded={open}
      onChange={() => setOpen(!open)}
      sx={{ backgroundColor }}
    >
      <AccordionSummary expandIcon={<ChevronDownIcon />}>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Typography>
            <strong>{title}</strong>
          </Typography>
          {!open && <ClosedSummary closedSummary={closedSummary} />}
        </Box>
      </AccordionSummary>
      <AccordionDetails>{children}</AccordionDetails>
    </StyledAccordion>
  );
};
