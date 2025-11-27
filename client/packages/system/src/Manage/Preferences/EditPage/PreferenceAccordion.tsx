import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  ChevronDownIcon,
} from '@openmsupply-client/common';
import React, { ReactNode } from 'react';

interface PreferenceAccordionProps {
  label: string;
  children: ReactNode;
  sx?: Record<string, unknown>;
}

export const PreferenceAccordion = ({
  label,
  children,
  sx,
}: PreferenceAccordionProps) => {
  return (
    <Accordion
      sx={{
        marginTop: 1,
        border: '1px solid',
        borderColor: 'grey.400',
        borderRadius: 1,
        boxShadow: 'none',
        '&::before': {
          display: 'none', // Common use case - hide the default border
        },
        ...sx,
      }}
    >
      <AccordionSummary
        expandIcon={<ChevronDownIcon />}
        sx={{ fontWeight: 'bold', fontSize: 16 }}
      >
        {label}
      </AccordionSummary>
      <AccordionDetails>{children}</AccordionDetails>
    </Accordion>
  );
};
