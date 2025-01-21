import React, { ReactElement, ReactNode } from 'react';
import {
  Stack,
  useTranslation,
  Typography,
  FlatButton,
  CloseIcon,
  Box,
  useTableStore,
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

export function ActionsFooter({
  actions,
  selectedRowCount,
}: ActionsFooterProps): ReactElement {
  const t = useTranslation();
  const { removeSelectedRows } = useTableStore();

  return (
    <Stack
      p={4}
      mx="-20px"
      height={64}
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      boxShadow={theme => `0 -5px 10px -5px ${theme.palette.grey[400]}`}
    >
      <Box gap={4} display="flex" alignItems="center">
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
            shouldShrink={shouldShrink ?? true}
          />
        ))}
      </Box>
      <FlatButton
        startIcon={<CloseIcon />}
        label={t('label.clear-selection')}
        onClick={removeSelectedRows}
      />
    </Stack>
  );
}
