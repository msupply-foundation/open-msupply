import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Typography,
} from '@common/components';
import { ChevronDownIcon, SvgIconProps } from '@common/icons';
import { LocaleKey, useTranslation } from '@common/intl';
import { Box } from '@mui/material';
import React, { FC, PropsWithChildren } from 'react';

interface SettingsSectionProps {
  children: JSX.Element | JSX.Element[];
  expanded: boolean;
  Icon: (props: SvgIconProps & { stroke?: string }) => JSX.Element;
  onChange: () => void;
  titleKey: LocaleKey;
}
export const SettingsSubHeading = ({ title }: { title: string }) => (
  <Typography
    sx={{
      fontWeight: 600,
      color: 'primary.main',
      marginLeft: '12px',
      paddingBottom: 1,
    }}
    component="div"
  >
    {title}
  </Typography>
);

export const SettingsSection: FC<PropsWithChildren<SettingsSectionProps>> = ({
  children,
  expanded,
  Icon,
  onChange,
  titleKey,
}) => {
  const t = useTranslation();

  return (
    <Accordion expanded={expanded} onChange={onChange}>
      <AccordionSummary
        expandIcon={<ChevronDownIcon />}
        sx={{
          color: 'primary.main',
          fontSize: 18,
          fontWeight: 'bold',
        }}
      >
        <Box
          display="flex"
          alignItems="center"
          sx={{ width: 48 }}
          justifyContent="center"
        >
          <Icon color="primary" />
        </Box>
        {t(titleKey)}
      </AccordionSummary>
      <AccordionDetails>{children}</AccordionDetails>
    </Accordion>
  );
};
