import React, { FC, ReactElement, ReactNode } from 'react';
import {
  Stack,
  useTranslation,
  Typography,
  Button,
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
      gap={8}
      alignItems="center"
      height={80}
      sx={{
        p: 4,
        mx: '-20px',
        boxShadow: theme => `0 -5px 10px -5px ${theme.palette.grey[400]}`,
      }}
    >
      <Typography
        fontSize="16px"
        sx={{
          fontWeight: 'bold',
        }}
      >
        {selectedRowCount} {t('label.selected')}
      </Typography>
      {actions.map(({ label, icon, onClick, disabled }) => (
        <Button
          key={label}
          startIcon={icon}
          disabled={disabled}
          onClick={onClick}
          size={'large'}
        >
          {label}
        </Button>
      ))}
    </Stack>
  );
};
