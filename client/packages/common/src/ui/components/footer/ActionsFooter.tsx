import React, { ReactElement, ReactNode } from 'react';
import {
  Stack,
  useTranslation,
  Typography,
  FlatButton,
  MinusCircleIcon,
} from '@openmsupply-client/common';

export interface Action {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  shouldShrink?: boolean;
}

interface ActionsFooterProps {
  actions: Action[];
  selectedRowCount: number;
  resetRowSelection: () => void;
}

export const ActionsFooter = ({
  actions,
  selectedRowCount,
  resetRowSelection,
}: ActionsFooterProps): ReactElement => {
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
        justifyContent: 'space-between',
      }}
    >
      <Stack direction="row" alignItems="center" gap={4}>
        <Typography
          sx={{
            pr: 1,
            fontWeight: 'bold',
          }}
        >
          {selectedRowCount} {t('label.selected')}
        </Typography>
        {actions.map(
          ({ label, icon, onClick, disabled, shouldShrink, loading }) => (
            <FlatButton
              key={label}
              startIcon={icon}
              label={label}
              disabled={disabled}
              loading={loading}
              onClick={onClick}
              // Flatbutton doesn't shrink by default but we want it to in actions footer
              shouldShrink={shouldShrink ?? true}
            />
          )
        )}
      </Stack>
      <FlatButton
        startIcon={<MinusCircleIcon />}
        label={t('label.clear-selection')}
        onClick={resetRowSelection}
        shouldShrink={true}
        color="secondary"
      />
    </Stack>
  );
};
