import { useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  LinearProgress,
  Typography,
} from '@mui/material';
import { format } from 'date-fns';
import { useTranslation } from '@/intl';
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
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{t('app.sync')}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, py: 1 }}>
          <Typography>
            {busy
              ? t('messages.syncing')
              : records > 0
                ? t('messages.records-to-push', { value: records })
                : t('messages.no-records-to-push')}
          </Typography>

          {busy ? <LinearProgress /> : null}

          {status?.errorMessage ? (
            <Alert severity="error" sx={{ whiteSpace: 'pre-wrap' }}>
              {status.errorMessage}
            </Alert>
          ) : null}

          <Typography variant="body2" color="text.secondary">
            {status?.lastSuccessfulSync
              ? t('messages.last-synced', {
                  time: format(
                    new Date(status.lastSuccessfulSync),
                    'dd/MM/yyyy HH:mm',
                  ),
                })
              : t('messages.never-synced')}
          </Typography>

          <Button
            variant="contained"
            onClick={() => sync.mutate()}
            disabled={busy}
            sx={{ alignSelf: 'flex-end' }}
          >
            {busy ? t('messages.syncing') : t('button.sync-now')}
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
