import React, { FC, ReactElement, ReactNode } from 'react';
import {
  Stack,
  useTranslation,
  DeleteIcon,
  ZapIcon,
  Typography,
  Button,
} from '@openmsupply-client/common';
import { useOutbound } from '../../api';
import { ArrowLeftIcon } from '@mui/x-date-pickers';

interface ActionFooter {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}

interface ActionsFooterProps {
  selectedRowCount: number;
  onReturnLines?: (stockLineIds: string[]) => void;
  showDelete?: boolean;
  showAllocate?: boolean;
  showReturnLines?: boolean;
}

export const ActionsFooter: FC<ActionsFooterProps> = ({
  selectedRowCount,
  onReturnLines,
  showDelete = false,
  showAllocate = false,
  showReturnLines = false,
}): ReactElement => {
  const t = useTranslation();
  const isDisabled = useOutbound.utils.isDisabled();
  const onDelete = useOutbound.line.deleteSelected();
  const { onAllocate } = useOutbound.line.allocateSelected();
  const selectedIds = useOutbound.utils.selectedIds();

  const actions = [
    showDelete && {
      label: t('button.delete-lines'),
      icon: <DeleteIcon />,
      onClick: onDelete,
      disabled: isDisabled,
    },
    showAllocate && {
      label: t('button.return-lines'),
      icon: <ZapIcon />,
      onClick: onAllocate,
      disabled: isDisabled,
    },
    showReturnLines && {
      label: t('button.return-lines'),
      icon: <ArrowLeftIcon />,
      onClick: () => onReturnLines?.(selectedIds),
    },
  ].filter(Boolean) as ActionFooter[];

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
          sx={{
            '&.MuiButton-text': {
              color: theme => theme.typography.body1.color,
            },
            '& .MuiButton-startIcon': {
              color: 'primary.main',
            },
          }}
        >
          {label}
        </Button>
      ))}
    </Stack>
  );
};
