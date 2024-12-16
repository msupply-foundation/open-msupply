import React, { FC, ReactElement, ReactNode } from 'react';
import {
  Stack,
  useTranslation,
  Typography,
  FlatButton,
} from '@openmsupply-client/common';

interface ActionFooter {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}

interface ActionsFooterProps {
  actions: ActionFooter[];
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
      {actions.map(({ label, icon, onClick, disabled }) => (
        <FlatButton
          key={label}
          startIcon={icon}
          label={label}
          disabled={disabled}
          onClick={onClick}
        />
      ))}
    </Stack>
  );
};
