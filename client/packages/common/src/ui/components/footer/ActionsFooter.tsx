import React, { FC, ReactElement, ReactNode } from 'react';
import {
  Stack,
  useTranslation,
  Typography,
  FlatButton,
  useNotification,
} from '@openmsupply-client/common';

export interface Action {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  shouldShrink?: boolean;
  disabledToastMessage?: string;
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
  const { info } = useNotification();

  const showDisabledActionToastMessage = (disabledToastMessage: string) =>
    info(disabledToastMessage);

  const handleDisabledClick = (
    disabled?: boolean,
    disabledToastMessage?: string
  ) => {
    if (!disabled) return undefined;
    return showDisabledActionToastMessage(
      disabledToastMessage ?? `${t('messages.cannot-perform-action')}`
    );
  };

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
      {actions.map(
        ({
          label,
          icon,
          onClick,
          disabled,
          shouldShrink,
          disabledToastMessage,
        }) => (
          <div
            key={label}
            onClick={handleDisabledClick(disabled, disabledToastMessage)}
          >
            <FlatButton
              startIcon={icon}
              label={label}
              disabled={disabled}
              onClick={onClick}
              // Flatbutton doesn't shrink by default but we want it to in actions footer
              shouldShrink={shouldShrink ?? true}
            />
          </div>
        )
      )}
    </Stack>
  );
};
