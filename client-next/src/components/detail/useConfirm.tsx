import { useCallback, useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';
import { useTranslation } from '@/intl';

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
}

interface ConfirmState extends ConfirmOptions {
  resolve: (ok: boolean) => void;
}

/**
 * Promise-based confirmation dialog. Render `dialog` once in the page, then
 * `await confirm({ message })` before a destructive/irreversible action — it
 * resolves true if the user confirms. Mirrors the legacy useConfirmationModal.
 */
export function useConfirm() {
  const { t } = useTranslation();
  const [state, setState] = useState<ConfirmState | null>(null);

  const confirm = useCallback(
    (opts: ConfirmOptions) =>
      new Promise<boolean>(resolve => setState({ ...opts, resolve })),
    [],
  );

  const close = (ok: boolean) => {
    state?.resolve(ok);
    setState(null);
  };

  const dialog = (
    <Dialog open={Boolean(state)} onClose={() => close(false)}>
      {state?.title ? <DialogTitle>{state.title}</DialogTitle> : null}
      <DialogContent>
        <DialogContentText sx={{ whiteSpace: 'pre-line' }}>
          {state?.message}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => close(false)}>{t('button.cancel')}</Button>
        <Button variant="contained" onClick={() => close(true)} autoFocus>
          {state?.confirmLabel ?? t('button.confirm')}
        </Button>
      </DialogActions>
    </Dialog>
  );

  return { confirm, dialog };
}
