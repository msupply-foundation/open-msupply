import React, { FC, ReactElement, ReactNode } from 'react';
import {
  Stack,
  useTranslation,
  Typography,
  FlatButton,
} from '@openmsupply-client/common';

export interface Action {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  shouldShrink?: boolean;
}

interface ActionsFooterProps {
  actions: Action[];
  selectedRowCount: number;
}

export const ActionsFooter: FC<ActionsFooterProps> = ({
  actions,
  selectedRowCount,
}): ReactElement => {
  const t = useTranslation();
  return (
    <Stack
      direction="row"
      alignItems="center"
      height={64}
      gap={4}
      sx={{
        p: 4,
        mx: '-20px',
        boxShadow: theme => `0 -5px 10px -5px ${theme.palette.grey[400]}`,
      }}
    >
      <Typography
        sx={{
          pr: 1,
          fontWeight: 'bold',
        }}
      >
        {selectedRowCount} {t('label.selected')}
      </Typography>
      {actions.map(({ label, icon, onClick, disabled, shouldShrink }) => (
        <FlatButton
          key={label}
          startIcon={icon}
          label={label}
          disabled={disabled}
          onClick={onClick}
          // Flatbutton doesn't shrink by default but we want it to for certain buttons in actions footer
          shouldShrink={shouldShrink ?? true}
        />
      ))}
    </Stack>
  );
};
