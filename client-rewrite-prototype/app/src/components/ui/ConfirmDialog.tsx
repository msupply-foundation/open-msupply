import type { ReactNode } from 'react';
import { HelpIcon, XCircleIcon, CheckIcon } from '@/components/icons';
import { Button } from './Button';
import { Dialog } from './Dialog';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
}

/*
 * Confirmation preset built on <Dialog>. This is the standard modal usage
 * pattern: the owning component keeps `open` state, renders <ConfirmDialog>, and
 * handles onConfirm. Cancel / scrim / Escape all close via onOpenChange; OK runs
 * onConfirm then closes.
 */
export const ConfirmDialog = ({
  open,
  onOpenChange,
  title = 'Are you sure?',
  message,
  confirmLabel = 'OK',
  cancelLabel = 'Cancel',
  onConfirm,
}: ConfirmDialogProps) => (
  <Dialog
    open={open}
    onOpenChange={onOpenChange}
    icon={<HelpIcon />}
    title={title}
    description={message}
    actions={
      <>
        <Button
          color="blue"
          icon={<XCircleIcon />}
          onClick={() => onOpenChange(false)}
        >
          {cancelLabel}
        </Button>
        <Button
          color="blue"
          icon={<CheckIcon />}
          onClick={() => {
            onConfirm();
            onOpenChange(false);
          }}
        >
          {confirmLabel}
        </Button>
      </>
    }
  />
);
