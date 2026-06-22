import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/intl';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';

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

const MAX_WIDTH: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'sm:max-w-xl',
  md: 'sm:max-w-2xl',
  lg: 'sm:max-w-4xl',
};

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
    <Dialog open={open} onOpenChange={next => (next ? undefined : onClose())}>
      <DialogContent
        className={cn('max-h-[90vh] overflow-y-auto', MAX_WIDTH[maxWidth])}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="py-1">{children}</div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            {t('button.cancel')}
          </Button>
          {onDelete ? (
            <Button variant="destructive" onClick={onDelete}>
              {t('button.delete')}
            </Button>
          ) : null}
          <Button onClick={onOk} disabled={okDisabled || saving}>
            {saving ? <Spinner className="size-4 text-current" /> : null}
            {okLabel ?? t('button.ok')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
