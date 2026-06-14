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
  UpdateCustomerReturnStatusInput,
} from '@/gql/schema';
import { useTranslation } from '@/intl';
import { formatCurrency } from '@/lib/format';
import { DetailHeaderBar } from '@/components/detail/DetailHeaderBar';
import { StatusBar } from '@/components/detail/StatusBar';
import { useConfirm } from '@/components/detail/useConfirm';
import { useInvoiceStatusName } from './status';
import { invoiceStatusFlow, invoiceReachedAt } from './statusFlow';
import {
  customerReturnKeys,
  customerReturnSdk,
  customerReturnQueryOptions,
} from './customerReturnDetail.queries';
import type {
  CustomerReturnDetailFragment,
  CustomerReturnLineRowFragment,
} from './customerReturnDetail.generated';

const route = getRouteApi(
  '/_authenticated/$storeId/distribution/customer-return/$invoiceId',
);

// Customer return advances only forward into these two statuses.
const TO_CUSTOMER_RETURN_STATUS: Partial<
  Record<InvoiceNodeStatus, UpdateCustomerReturnStatusInput>
> = {
  RECEIVED: UpdateCustomerReturnStatusInput.Received,
  VERIFIED: UpdateCustomerReturnStatusInput.Verified,
} as Partial<Record<InvoiceNodeStatus, UpdateCustomerReturnStatusInput>>;

// One stacked label/value row inside a mobile line card.
function CardRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, minWidth: 0 }}>
      <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ textAlign: 'right', minWidth: 0, wordBreak: 'break-word' }}>
        {value}
      </Typography>
    </Box>
  );
}

// Phone equivalent of a read-only line table row: one outlined Paper card with
// stacked label/value rows. No editable inputs (lines are read-only here).
function LineCard({ line }: { line: CustomerReturnLineRowFragment }) {
  const { t } = useTranslation();
  return (
    <Paper variant="outlined" sx={{ p: 1.5, mb: 1 }}>
      <Stack spacing={0.5}>
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, minWidth: 0 }}>
          <Typography variant="subtitle2" sx={{ flex: 1, minWidth: 0, wordBreak: 'break-word' }}>
            {line.item.name}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
            {line.item.code}
          </Typography>
        </Box>
        {line.batch ? <CardRow label={t('label.batch')} value={line.batch} /> : null}
        {line.expiryDate ? (
          <CardRow label={t('label.expiry')} value={line.expiryDate} />
        ) : null}
        <CardRow label={t('label.pack-size')} value={line.packSize} />
        <CardRow label={t('label.pack-quantity')} value={line.numberOfPacks} />
        <CardRow
          label={t('label.total-quantity')}
          value={(line.packSize * line.numberOfPacks).toLocaleString()}
        />
        <CardRow
          label={t('label.price-per-pack')}
          value={formatCurrency(line.sellPricePerPack)}
        />
        <CardRow
          label={t('label.total')}
          value={formatCurrency(line.sellPricePerPack * line.numberOfPacks)}
        />
      </Stack>
    </Paper>
  );
}

export function CustomerReturnDetailPage() {
  const { storeId, invoiceId } = route.useParams();
  const { t } = useTranslation();

  const { data, isLoading } = useQuery({
    ...customerReturnQueryOptions(storeId, invoiceId),
    enabled: Boolean(storeId),
  });

  if (isLoading) return <Typography>{t('messages.loading')}</Typography>;
  if (!data) return <Typography>{t('messages.invoice-not-found')}</Typography>;

  return <CustomerReturnEditor storeId={storeId} invoice={data} />;
}

function CustomerReturnEditor({
  storeId,
  invoice,
}: {
  storeId: string;
  invoice: CustomerReturnDetailFragment;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const isPhone = useMediaQuery(theme.breakpoints.down('sm'));
  const queryClient = useQueryClient();
  const statusName = useInvoiceStatusName();
  const { confirm, dialog } = useConfirm();

  const flow = invoiceStatusFlow(InvoiceNodeType.CustomerReturn, {
    linked: Boolean(invoice.linkedShipment?.id),
  });
  const editable = flow.editable.includes(invoice.status);
  const lines = invoice.lines.nodes;

  // Header fields are controlled (MUI inputs); lines are read-only (the
  // generate-lines wizard is deferred), so Save only ever pushes the header.
  const [theirReference, setTheirReference] = useState(
    invoice.theirReference ?? '',
  );
  const [comment, setComment] = useState(invoice.comment ?? '');
  const [snackbar, setSnackbar] = useState<string | null>(null);

  // Re-baseline whenever the document refetches (after a save/status change).
  useEffect(() => {
    setTheirReference(invoice.theirReference ?? '');
    setComment(invoice.comment ?? '');
  }, [invoice]);

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: customerReturnKeys.detail(storeId, invoice.id),
    });

  const headerDirty =
    theirReference !== (invoice.theirReference ?? '') ||
    comment !== (invoice.comment ?? '');

  const save = useMutation({
    mutationFn: async () => {
      const res = await customerReturnSdk.updateCustomerReturn({
        storeId,
        input: { id: invoice.id, theirReference, comment },
      });
      if (
        res.updateCustomerReturn.__typename === 'UpdateCustomerReturnError'
      )
        throw new Error(res.updateCustomerReturn.error.description);
    },
    onSuccess: invalidate,
    onError: e => setSnackbar(e instanceof Error ? e.message : String(e)),
  });

  const advance = useMutation({
    mutationFn: async (target: InvoiceNodeStatus) => {
      const status = TO_CUSTOMER_RETURN_STATUS[target];
      const res = await customerReturnSdk.updateCustomerReturn({
        storeId,
        input: { id: invoice.id, status },
      });
      if (
        res.updateCustomerReturn.__typename === 'UpdateCustomerReturnError'
      )
        throw new Error(res.updateCustomerReturn.error.description);
    },
    onSuccess: invalidate,
    onError: e => setSnackbar(e instanceof Error ? e.message : String(e)),
  });

  const toggleHold = useMutation({
    mutationFn: () =>
      customerReturnSdk.updateCustomerReturn({
        storeId,
        input: { id: invoice.id, onHold: !invoice.onHold },
      }),
    onSuccess: invalidate,
  });

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

  const summary = t('messages.line-count', {
    value: lines.length.toLocaleString(),
  });

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 1.5 }}>
      <DetailHeaderBar
        title={t('heading.customer-return', { number: invoice.invoiceNumber })}
        statusLabel={statusName(invoice.status)}
        summary={summary}
        onSave={() => save.mutate()}
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
          label={t('label.customer-name')}
          value={invoice.otherPartyName}
          size="small"
          disabled
          sx={{ minWidth: 220 }}
        />
        <TextField
          label={t('label.customer-ref')}
          value={theirReference}
          onChange={e => setTheirReference(e.target.value)}
          size="small"
          disabled={!editable}
          sx={{ minWidth: 220 }}
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
        <Box sx={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
          {lines.map(line => (
            <LineCard key={line.id} line={line} />
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
                <TableCell sx={{ fontWeight: 600 }} align="right">
                  {t('label.pack-size')}
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">
                  {t('label.pack-quantity')}
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">
                  {t('label.total-quantity')}
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">
                  {t('label.price-per-pack')}
                </TableCell>
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
                  <TableCell align="right">{line.packSize}</TableCell>
                  <TableCell align="right">{line.numberOfPacks}</TableCell>
                  <TableCell align="right">
                    {(line.packSize * line.numberOfPacks).toLocaleString()}
                  </TableCell>
                  <TableCell align="right">
                    {formatCurrency(line.sellPricePerPack)}
                  </TableCell>
                  <TableCell align="right">
                    {formatCurrency(line.sellPricePerPack * line.numberOfPacks)}
                  </TableCell>
                </TableRow>
              ))}
              {lines.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9}>
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
