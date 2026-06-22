import { useCallback, useState } from 'react';
import { useTranslation } from '@/intl';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

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
    <AlertDialog
      open={Boolean(state)}
      onOpenChange={open => (open ? undefined : close(false))}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {state?.title ?? t('button.confirm')}
          </AlertDialogTitle>
          <AlertDialogDescription className="whitespace-pre-line">
            {state?.message}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => close(false)}>
            {t('button.cancel')}
          </AlertDialogCancel>
          <AlertDialogAction onClick={() => close(true)}>
            {state?.confirmLabel ?? t('button.confirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { confirm, dialog };
}
