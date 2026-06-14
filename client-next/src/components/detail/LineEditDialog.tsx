import type { ReactNode } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from '@mui/material';
import { useTranslation } from '@/intl';

interface LineEditDialogProps {
  open: boolean;
  title: string;
  onClose: () => void;
  onOk: () => void;
  okDisabled?: boolean;
  okLabel?: string;
  saving?: boolean;
  onDelete?: () => void;
  children: ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg';
}

/**
 * Standard add/edit-line modal frame: title, scrollable body, and a
 * cancel / delete? / ok action row. Adapts the legacy useDialog modal.
 */
export function LineEditDialog({
  open,
  title,
  onClose,
  onOk,
  okDisabled,
  okLabel,
  saving,
  onDelete,
  children,
  maxWidth = 'sm',
}: LineEditDialogProps) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth={maxWidth}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>{children}</DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>{t('button.cancel')}</Button>
        {onDelete ? (
          <Button color="error" onClick={onDelete}>
            {t('button.delete')}
          </Button>
        ) : null}
        <Button
          variant="contained"
          onClick={onOk}
          disabled={okDisabled || saving}
        >
          {okLabel ?? t('button.ok')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
