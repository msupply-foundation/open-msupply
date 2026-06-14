import { useEffect, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getRouteApi } from '@tanstack/react-router';
import {
  Box,
  Button,
  Paper,
  Snackbar,
  Alert,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  InvoiceNodeType,
  type InvoiceNodeStatus,
  UpdateSupplierReturnStatusInput,
} from '@/gql/schema';
import { useTranslation } from '@/intl';
import { formatCurrency } from '@/lib/format';
import { DetailHeaderBar } from '@/components/detail/DetailHeaderBar';
import { StatusBar } from '@/components/detail/StatusBar';
import { useConfirm } from '@/components/detail/useConfirm';
import { useInvoiceStatusName } from './status';
import { invoiceStatusFlow, invoiceReachedAt } from './statusFlow';
import {
  supplierReturnKeys,
  supplierReturnSdk,
  supplierReturnQueryOptions,
} from './supplierReturnDetail.queries';
import type { SupplierReturnDetailFragment } from './supplierReturnDetail.generated';

const route = getRouteApi(
  '/_authenticated/$storeId/replenishment/supplier-return/$invoiceId',
);

// Supplier return advances only forward into these two statuses.
const TO_SUPPLIER_RETURN_STATUS: Partial<
  Record<InvoiceNodeStatus, UpdateSupplierReturnStatusInput>
> = {
  PICKED: UpdateSupplierReturnStatusInput.Picked,
  SHIPPED: UpdateSupplierReturnStatusInput.Shipped,
} as Partial<Record<InvoiceNodeStatus, UpdateSupplierReturnStatusInput>>;

export function SupplierReturnDetailPage() {
  const { storeId, invoiceId } = route.useParams();
  const { t } = useTranslation();

  const { data, isLoading } = useQuery({
    ...supplierReturnQueryOptions(storeId, invoiceId),
    enabled: Boolean(storeId),
  });

  if (isLoading) return <Typography>{t('messages.loading')}</Typography>;
  if (!data) return <Typography>{t('messages.invoice-not-found')}</Typography>;

  return <SupplierReturnEditor storeId={storeId} invoice={data} />;
}

function SupplierReturnEditor({
  storeId,
  invoice,
}: {
  storeId: string;
  invoice: SupplierReturnDetailFragment;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const isPhone = useMediaQuery(theme.breakpoints.down('sm'));
  const queryClient = useQueryClient();
  const statusName = useInvoiceStatusName();
  const { confirm, dialog } = useConfirm();

  const flow = invoiceStatusFlow(InvoiceNodeType.SupplierReturn);
  const editable = flow.editable.includes(invoice.status);
  const lines = invoice.lines.nodes;

  // Header fields are controlled (MUI inputs) and feed the single Save.
  const [theirReference, setTheirReference] = useState(invoice.theirReference ?? '');
  const [comment, setComment] = useState(invoice.comment ?? '');
  const [snackbar, setSnackbar] = useState<string | null>(null);

  // Re-baseline the form whenever the document refetches (after a save/status change).
  useEffect(() => {
    setTheirReference(invoice.theirReference ?? '');
    setComment(invoice.comment ?? '');
  }, [invoice]);

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: supplierReturnKeys.detail(storeId, invoice.id),
    });

  const headerDirty =
    theirReference !== (invoice.theirReference ?? '') ||
    comment !== (invoice.comment ?? '');

  const save = useMutation({
    mutationFn: () =>
      supplierReturnSdk.updateSupplierReturn({
        storeId,
        input: { id: invoice.id, theirReference, comment },
      }),
    onSuccess: invalidate,
    onError: e => setSnackbar(e instanceof Error ? e.message : String(e)),
  });

  const advance = useMutation({
    mutationFn: (target: InvoiceNodeStatus) =>
      supplierReturnSdk.updateSupplierReturn({
        storeId,
        input: { id: invoice.id, status: TO_SUPPLIER_RETURN_STATUS[target] },
      }),
    onSuccess: invalidate,
    onError: e => setSnackbar(e instanceof Error ? e.message : String(e)),
  });

  const toggleHold = useMutation({
    mutationFn: () =>
      supplierReturnSdk.updateSupplierReturn({
        storeId,
        input: { id: invoice.id, onHold: !invoice.onHold },
      }),
    onSuccess: invalidate,
  });

  const onSave = () => save.mutate();

  const onAdvance = async (target: InvoiceNodeStatus) => {
    const ok = await confirm({
      message: t('messages.confirm-status-as', { status: statusName(target) }),
    });
    if (ok) advance.mutate(target);
  };

  const onToggleHold = async () => {
    const ok = await confirm({
      message: invoice.onHold
        ? t('messages.off-hold-confirm')
        : t('messages.on-hold-confirm'),
    });
    if (ok) toggleHold.mutate();
  };

  const summary = [
    t('messages.line-count', { value: lines.length.toLocaleString() }),
    headerDirty ? t('messages.edited-count', { value: 1 }) : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 1.5 }}>
      <DetailHeaderBar
        title={t('heading.supplier-return', { number: invoice.invoiceNumber })}
        statusLabel={statusName(invoice.status)}
        summary={summary}
        onSave={onSave}
        saveDisabled={!headerDirty || !editable}
        saving={save.isPending}
        actions={
          editable ? (
            <Button
              size="small"
              color="inherit"
              onClick={onToggleHold}
              disabled={toggleHold.isPending}
            >
              {invoice.onHold ? t('button.take-off-hold') : t('button.hold')}
            </Button>
          ) : null
        }
      />

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          label={t('label.supplier-name')}
          value={invoice.otherPartyName}
          size="small"
          disabled
          fullWidth={isPhone}
          sx={{ minWidth: { xs: 0, sm: 220 } }}
        />
        <TextField
          label={t('label.supplier-ref')}
          value={theirReference}
          onChange={e => setTheirReference(e.target.value)}
          size="small"
          disabled={!editable}
          fullWidth={isPhone}
          sx={{ minWidth: { xs: 0, sm: 220 } }}
        />
        <TextField
          label={t('label.comment')}
          value={comment}
          onChange={e => setComment(e.target.value)}
          size="small"
          fullWidth
          disabled={!editable}
        />
      </Stack>

      {isPhone ? (
        // Phone: stack each read-only line as a card so the page never scrolls
        // horizontally. The sm+ table below stays unchanged.
        <Box sx={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
          {lines.map(line => (
            <SupplierReturnLineCard key={line.id} line={line} />
          ))}
          {lines.length === 0 ? (
            <Typography color="text.secondary" sx={{ py: 2 }}>
              {t('messages.no-lines')}
            </Typography>
          ) : null}
        </Box>
      ) : (
        <Paper variant="outlined" sx={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>{t('label.code')}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{t('label.name')}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{t('label.batch')}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{t('label.expiry')}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{t('label.pack-size')}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{t('label.pack-quantity')}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{t('label.cost-per-pack')}</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">
                  {t('label.total')}
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {lines.map(line => (
                <TableRow key={line.id} hover>
                  <TableCell>{line.item.code}</TableCell>
                  <TableCell>{line.item.name}</TableCell>
                  <TableCell>{line.batch ?? ''}</TableCell>
                  <TableCell>{line.expiryDate ?? ''}</TableCell>
                  <TableCell>{line.packSize}</TableCell>
                  <TableCell>{line.numberOfPacks}</TableCell>
                  <TableCell>{formatCurrency(line.costPricePerPack)}</TableCell>
                  <TableCell align="right">
                    {formatCurrency(line.costPricePerPack * line.numberOfPacks)}
                  </TableCell>
                </TableRow>
              ))}
              {lines.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8}>
                    <Typography color="text.secondary" sx={{ py: 2 }}>
                      {t('messages.no-lines')}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </Paper>
      )}

      <StatusBar
        sequence={flow.sequence}
        current={invoice.status}
        reachedAt={invoiceReachedAt(invoice)}
        label={statusName}
        nextOptions={flow.next[invoice.status] ?? []}
        onAdvance={onAdvance}
        advancing={advance.isPending}
        disabled={!editable || invoice.onHold}
      />

      {dialog}

      <Snackbar
        open={Boolean(snackbar)}
        autoHideDuration={8000}
        onClose={() => setSnackbar(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" variant="filled" onClose={() => setSnackbar(null)}>
          {snackbar}
        </Alert>
      </Snackbar>
    </Box>
  );
}

// Phone-only stacked label/value row inside a line card.
function CardRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 1,
        minWidth: 0,
      }}
    >
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography
        variant="body2"
        sx={{ textAlign: 'right', wordBreak: 'break-word', minWidth: 0 }}
      >
        {value}
      </Typography>
    </Box>
  );
}

// Read-only line rendered as a card on phones (no horizontal scroll). Mirrors
// the desktop table columns.
function SupplierReturnLineCard({
  line,
}: {
  line: SupplierReturnDetailFragment['lines']['nodes'][number];
}) {
  const { t } = useTranslation();
  return (
    <Paper variant="outlined" sx={{ p: 1.5, mb: 1 }}>
      <Stack spacing={0.75}>
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, minWidth: 0 }}>
          <Typography
            variant="subtitle2"
            sx={{ flex: 1, wordBreak: 'break-word', minWidth: 0 }}
          >
            {line.item.name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {line.item.code}
          </Typography>
        </Box>
        <CardRow label={t('label.batch')} value={line.batch ?? ''} />
        <CardRow label={t('label.expiry')} value={line.expiryDate ?? ''} />
        <CardRow label={t('label.pack-size')} value={line.packSize} />
        <CardRow label={t('label.pack-quantity')} value={line.numberOfPacks} />
        <CardRow
          label={t('label.cost-per-pack')}
          value={formatCurrency(line.costPricePerPack)}
        />
        <CardRow
          label={t('label.total')}
          value={formatCurrency(line.costPricePerPack * line.numberOfPacks)}
        />
      </Stack>
    </Paper>
  );
}
