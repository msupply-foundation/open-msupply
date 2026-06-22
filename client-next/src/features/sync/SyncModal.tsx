import { useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useTranslation } from '@/intl';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { syncSdk } from './api';
import { syncKeys, syncStatusQueryOptions } from './queries';

export function SyncModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // Poll quickly while the modal is open; the drawer keeps it warm otherwise.
  const { data: status } = useQuery({
    ...syncStatusQueryOptions(),
    refetchInterval: open ? 2000 : false,
  });
  const isSyncing = status?.isSyncing ?? false;

  const sync = useMutation({
    mutationFn: () => syncSdk.manualSync({}),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: syncKeys.status }),
  });

  // When a running sync finishes (isSyncing true -> false), refresh the data on
  // the current page by refetching active queries.
  const wasSyncing = useRef(false);
  useEffect(() => {
    if (wasSyncing.current && !isSyncing) void queryClient.invalidateQueries();
    wasSyncing.current = isSyncing;
  }, [isSyncing, queryClient]);

  const busy = isSyncing || sync.isPending;
  const records = status?.numberOfRecordsInPushQueue ?? 0;

  return (
    <Dialog open={open} onOpenChange={next => (next ? undefined : onClose())}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('app.sync')}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-1">
          <p>
            {busy
              ? t('messages.syncing')
              : records > 0
                ? t('messages.records-to-push', { value: records })
                : t('messages.no-records-to-push')}
          </p>

          {busy ? (
            <div className="h-1 w-full overflow-hidden rounded bg-muted">
              <div className="h-full w-1/3 animate-pulse rounded bg-primary" />
            </div>
          ) : null}

          {status?.errorMessage ? (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm whitespace-pre-wrap text-destructive">
              {status.errorMessage}
            </p>
          ) : null}

          <p className="text-sm text-muted-foreground">
            {status?.lastSuccessfulSync
              ? t('messages.last-synced', {
                  time: format(
                    new Date(status.lastSuccessfulSync),
                    'dd/MM/yyyy HH:mm',
                  ),
                })
              : t('messages.never-synced')}
          </p>

          <Button
            className="self-end"
            onClick={() => sync.mutate()}
            disabled={busy}
          >
            {busy ? t('messages.syncing') : t('button.sync-now')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
