import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useForm, type UseFormRegister } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getRouteApi } from '@tanstack/react-router';
import { PlusIcon, Trash2Icon } from 'lucide-react';
import { toast } from 'sonner';
import {
  RequisitionNodeType,
  type RequisitionNodeStatus,
  UpdateResponseRequisitionStatusInput,
} from '@/gql/schema';
import { useTranslation } from '@/intl';
import { useIsPhone } from '@/hooks/useMediaQuery';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { DetailHeaderBar } from '@/components/detail/DetailHeaderBar';
import { StatusBar } from '@/components/detail/StatusBar';
import { LineEditDialog } from '@/components/detail/LineEditDialog';
import { ItemSearchInput } from '@/components/detail/ItemSearchInput';
import { useConfirm } from '@/components/detail/useConfirm';
import {
  INPUT_BASE,
  inputStyle,
  makeNonNegativeValidator,
  numericField,
} from '@/components/detail/inputs';
import type { ItemOptionFragment } from '@/features/items/items.generated';
import { useRequisitionStatusName } from './status';
import { requisitionStatusFlow, requisitionReachedAt } from './statusFlow';
import {
  responseKeys,
  responseSdk,
  responseRequisitionQueryOptions,
} from './responseDetail.queries';
import type {
  ResponseDetailFragment,
  ResponseLineRowFragment,
} from './responseDetail.generated';

const route = getRouteApi(
  '/_authenticated/$storeId/distribution/customer-requisition/$requisitionId',
);

export function CustomerRequisitionDetailPage() {
  const { storeId, requisitionId } = route.useParams();
  const { t } = useTranslation();

  const { data, isLoading } = useQuery({
    ...responseRequisitionQueryOptions(storeId, requisitionId),
    enabled: Boolean(storeId),
  });

  if (isLoading) return <p>{t('messages.loading')}</p>;
  if (!data) return <p>{t('messages.requisition-not-found')}</p>;

  return <ResponseEditor storeId={storeId} requisition={data} />;
}

interface LineForm {
  requestedQuantity: string;
  supplyQuantity: string;
  comment: string;
}
interface FormValues {
  lines: Record<string, LineForm>;
}

const toLineForm = (l: ResponseLineRowFragment): LineForm => ({
  requestedQuantity: l.requestedQuantity?.toString() ?? '',
  supplyQuantity: l.supplyQuantity?.toString() ?? '',
  comment: l.comment ?? '',
});

function ResponseEditor({
  storeId,
  requisition,
}: {
  storeId: string;
  requisition: ResponseDetailFragment;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const statusName = useRequisitionStatusName();
  const { confirm, dialog } = useConfirm();
  const isPhone = useIsPhone();

  const flow = requisitionStatusFlow(RequisitionNodeType.Response);
  const editable = flow.editable.includes(requisition.status);
  const lines = requisition.lines.nodes;
  const linesById = useMemo(() => new Map(lines.map(l => [l.id, l])), [lines]);

  const defaultValues = useMemo<FormValues>(
    () => ({
      lines: Object.fromEntries(lines.map(l => [l.id, toLineForm(l)])),
    }),
    [lines],
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { dirtyFields, isDirty, errors },
  } = useForm<FormValues>({ defaultValues, mode: 'onChange' });

  // Header fields are controlled and tracked separately from the line grid;
  // both feed the single Save.
  const [theirReference, setTheirReference] = useState(
    requisition.theirReference ?? '',
  );
  const [comment, setComment] = useState(requisition.comment ?? '');

  // Re-baseline the form whenever the document refetches (after a save/status change).
  useEffect(() => {
    reset(defaultValues);
    setTheirReference(requisition.theirReference ?? '');
    setComment(requisition.comment ?? '');
  }, [requisition, defaultValues, reset]);

  const numeric = useMemo(
    () => ({ validate: makeNonNegativeValidator(t) }),
    [t],
  );

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: responseKeys.detail(storeId, requisition.id),
    });

  const headerDirty =
    theirReference !== (requisition.theirReference ?? '') ||
    comment !== (requisition.comment ?? '');

  const save = useMutation({
    mutationFn: async (values: FormValues) => {
      const messages = new Set<string>();

      if (headerDirty) {
        const res = await responseSdk.updateResponse({
          storeId,
          input: { id: requisition.id, theirReference, comment },
        });
        if (
          res.updateResponseRequisition.__typename ===
          'UpdateResponseRequisitionError'
        )
          messages.add(res.updateResponseRequisition.error.description);
      }

      const dirtyLines = dirtyFields.lines ?? {};
      await Promise.all(
        Object.keys(dirtyLines).map(async id => {
          const d = dirtyLines[id];
          const f = values.lines[id];
          if (!d || !f || !linesById.has(id)) return;
          const res = await responseSdk.updateResponseLine({
            storeId,
            input: {
              id,
              ...(d.requestedQuantity && f.requestedQuantity !== ''
                ? { requestedQuantity: Number(f.requestedQuantity) }
                : {}),
              ...(d.supplyQuantity && f.supplyQuantity !== ''
                ? { supplyQuantity: Number(f.supplyQuantity) }
                : {}),
              ...(d.comment ? { comment: f.comment } : {}),
            },
          });
          if (
            res.updateResponseRequisitionLine.__typename ===
            'UpdateResponseRequisitionLineError'
          )
            messages.add(res.updateResponseRequisitionLine.error.description);
        }),
      );

      return [...messages];
    },
    onSuccess: errs => {
      invalidate();
      if (errs.length) toast.error(errs.join(' '));
    },
  });

  const advance = useMutation({
    mutationFn: async () => {
      const res = await responseSdk.updateResponse({
        storeId,
        input: {
          id: requisition.id,
          status: UpdateResponseRequisitionStatusInput.Finalised,
        },
      });
      if (
        res.updateResponseRequisition.__typename ===
        'UpdateResponseRequisitionError'
      )
        throw new Error(res.updateResponseRequisition.error.description);
    },
    onSuccess: invalidate,
    onError: e => toast.error(e instanceof Error ? e.message : String(e)),
  });

  const supplyRequested = useMutation({
    mutationFn: async () => {
      const res = await responseSdk.supplyRequested({
        storeId,
        input: { responseRequisitionId: requisition.id },
      });
      if (
        res.supplyRequestedQuantity.__typename ===
        'SupplyRequestedQuantityError'
      )
        throw new Error(res.supplyRequestedQuantity.error.description);
    },
    onSuccess: invalidate,
    onError: e => toast.error(e instanceof Error ? e.message : String(e)),
  });

  const deleteLine = useMutation({
    mutationFn: (id: string) =>
      responseSdk.deleteResponseLine({ storeId, input: { id } }),
    onSuccess: invalidate,
  });

  const onSave = handleSubmit(values => save.mutate(values));

  const onAdvance = async (target: RequisitionNodeStatus) => {
    const ok = await confirm({
      message: t('messages.confirm-status-as', { status: statusName(target) }),
    });
    if (ok) advance.mutate();
  };

  const onSupplyRequested = async () => {
    const ok = await confirm({
      message: t('messages.confirm-supply-requested'),
    });
    if (ok) supplyRequested.mutate();
  };

  const onDeleteLine = async (line: ResponseLineRowFragment) => {
    const ok = await confirm({ message: t('messages.confirm-delete-line') });
    if (ok) deleteLine.mutate(line.id);
  };

  const dirtyLineCount = Object.keys(dirtyFields.lines ?? {}).length;
  const errorCount = useMemo(
    () =>
      Object.values(errors.lines ?? {}).filter(e => e && Object.keys(e).length)
        .length,
    [errors.lines],
  );
  const summary = [
    t('messages.line-count', { value: lines.length.toLocaleString() }),
    dirtyLineCount || headerDirty
      ? t('messages.edited-count', {
          value: dirtyLineCount + (headerDirty ? 1 : 0),
        })
      : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const [addOpen, setAddOpen] = useState(false);

  return (
    <div className="flex h-full flex-col gap-3">
      <DetailHeaderBar
        title={t('heading.customer-requisition', {
          number: requisition.requisitionNumber,
        })}
        statusLabel={statusName(requisition.status)}
        summary={summary}
        onSave={onSave}
        saveDisabled={(!isDirty && !headerDirty) || errorCount > 0 || !editable}
        saving={save.isPending}
        actions={
          editable ? (
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={onSupplyRequested}
                disabled={supplyRequested.isPending}
              >
                {t('button.supply-requested')}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setAddOpen(true)}
              >
                <PlusIcon />
                {t('button.add-item')}
              </Button>
            </>
          ) : null
        }
      />

      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="grid gap-1.5 sm:min-w-[220px]">
          <Label>{t('label.customer-name')}</Label>
          <Input value={requisition.otherPartyName} disabled />
        </div>
        <div className="grid gap-1.5 sm:min-w-[220px]">
          <Label>{t('label.customer-ref')}</Label>
          <Input
            value={theirReference}
            onChange={e => setTheirReference(e.target.value)}
            disabled={!editable}
          />
        </div>
        <div className="grid flex-1 gap-1.5">
          <Label>{t('label.comment')}</Label>
          <Input
            value={comment}
            onChange={e => setComment(e.target.value)}
            disabled={!editable}
          />
        </div>
      </div>

      {isPhone ? (
        <div className="min-h-0 flex-1 overflow-auto">
          {lines.map(line => {
            const lineErr = errors.lines?.[line.id];
            return (
              <ResponseLineCard
                key={line.id}
                line={line}
                editable={editable}
                requestedInvalid={Boolean(lineErr?.requestedQuantity)}
                supplyInvalid={Boolean(lineErr?.supplyQuantity)}
                register={register}
                numeric={numeric}
                onDelete={() => onDeleteLine(line)}
              />
            );
          })}
          {lines.length === 0 ? (
            <p className="py-4 text-muted-foreground">
              {t('messages.no-lines')}
            </p>
          ) : null}
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto rounded-md border bg-card">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-card">
              <TableRow>
                <TableHead className="font-semibold">
                  {t('label.code')}
                </TableHead>
                <TableHead className="font-semibold">
                  {t('label.name')}
                </TableHead>
                <TableHead className="font-semibold">
                  {t('label.unit')}
                </TableHead>
                <TableHead className="text-right font-semibold">
                  {t('label.our-soh')}
                </TableHead>
                <TableHead className="text-right font-semibold">
                  {t('label.customer-soh')}
                </TableHead>
                <TableHead className="text-right font-semibold">
                  {t('label.suggested')}
                </TableHead>
                <TableHead className="font-semibold">
                  {t('label.requested')}
                </TableHead>
                <TableHead className="text-right font-semibold">
                  {t('label.already-issued')}
                </TableHead>
                <TableHead className="text-right font-semibold">
                  {t('label.remaining-to-supply')}
                </TableHead>
                <TableHead className="font-semibold">
                  {t('label.supply-quantity')}
                </TableHead>
                <TableHead className="font-semibold">
                  {t('label.comment')}
                </TableHead>
                {editable ? <TableHead className="w-px" /> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map(line => {
                const lineErr = errors.lines?.[line.id];
                return (
                  <TableRow key={line.id}>
                    <TableCell>{line.item.code}</TableCell>
                    <TableCell>{line.item.name}</TableCell>
                    <TableCell>{line.item.unitName ?? ''}</TableCell>
                    <TableCell className="text-right">
                      {line.itemStats.stockOnHand}
                    </TableCell>
                    <TableCell className="text-right">
                      {line.availableStockOnHand}
                    </TableCell>
                    <TableCell className="text-right">
                      {line.suggestedQuantity}
                    </TableCell>
                    <TableCell className="w-[110px]">
                      {editable ? (
                        <input
                          style={inputStyle(
                            Boolean(lineErr?.requestedQuantity),
                          )}
                          {...numericField(
                            register(
                              `lines.${line.id}.requestedQuantity`,
                              numeric,
                            ),
                          )}
                        />
                      ) : (
                        line.requestedQuantity
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {line.alreadyIssued}
                    </TableCell>
                    <TableCell className="text-right">
                      {line.remainingQuantityToSupply}
                    </TableCell>
                    <TableCell className="w-[110px]">
                      {editable ? (
                        <input
                          style={inputStyle(Boolean(lineErr?.supplyQuantity))}
                          {...numericField(
                            register(
                              `lines.${line.id}.supplyQuantity`,
                              numeric,
                            ),
                          )}
                        />
                      ) : (
                        line.supplyQuantity
                      )}
                    </TableCell>
                    <TableCell className="min-w-[160px]">
                      {editable ? (
                        <input
                          style={INPUT_BASE}
                          {...register(`lines.${line.id}.comment`)}
                        />
                      ) : (
                        (line.comment ?? '')
                      )}
                    </TableCell>
                    {editable ? (
                      <TableCell className="w-px">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              onClick={() => onDeleteLine(line)}
                              aria-label={t('button.delete')}
                            >
                              <Trash2Icon />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{t('button.delete')}</TooltipContent>
                        </Tooltip>
                      </TableCell>
                    ) : null}
                  </TableRow>
                );
              })}
              {lines.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12}>
                    <p className="py-4 text-muted-foreground">
                      {t('messages.no-lines')}
                    </p>
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      )}

      <StatusBar
        sequence={flow.sequence}
        current={requisition.status}
        reachedAt={requisitionReachedAt(requisition)}
        label={statusName}
        nextOptions={flow.next[requisition.status] ?? []}
        onAdvance={onAdvance}
        advancing={advance.isPending}
        disabled={!editable}
      />

      <AddResponseLineDialog
        open={addOpen}
        storeId={storeId}
        requisitionId={requisition.id}
        existingItemIds={lines.map(l => l.itemId)}
        onClose={() => setAddOpen(false)}
        onAdded={() => {
          setAddOpen(false);
          invalidate();
        }}
      />

      {dialog}
    </div>
  );
}

// Stacked label/value row used inside the phone card layout.
function CardRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

// Phone layout for a single response line: the same editable fields as the
// desktop table row, stacked in a card so there is no horizontal overflow.
function ResponseLineCard({
  line,
  editable,
  requestedInvalid,
  supplyInvalid,
  register,
  numeric,
  onDelete,
}: {
  line: ResponseLineRowFragment;
  editable: boolean;
  requestedInvalid: boolean;
  supplyInvalid: boolean;
  register: UseFormRegister<FormValues>;
  numeric: { validate: (raw: string) => true | string };
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="mb-2 rounded-md border bg-card p-3">
      <div className="flex items-baseline gap-2">
        <span className="min-w-0 flex-1 text-sm font-semibold">
          {line.item.name}
        </span>
        <span className="text-xs text-muted-foreground">{line.item.code}</span>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <CardRow label={t('label.our-soh')}>
          <span className="text-sm">{line.itemStats.stockOnHand}</span>
        </CardRow>
        <CardRow label={t('label.customer-soh')}>
          <span className="text-sm">{line.availableStockOnHand}</span>
        </CardRow>
        <CardRow label={t('label.suggested')}>
          <span className="text-sm">{line.suggestedQuantity}</span>
        </CardRow>
        <CardRow label={t('label.already-issued')}>
          <span className="text-sm">{line.alreadyIssued}</span>
        </CardRow>
        <CardRow label={t('label.requested')}>
          {editable ? (
            <input
              style={inputStyle(requestedInvalid)}
              {...numericField(
                register(`lines.${line.id}.requestedQuantity`, numeric),
              )}
            />
          ) : (
            <span className="text-sm">{line.requestedQuantity}</span>
          )}
        </CardRow>
        <CardRow label={t('label.supply-quantity')}>
          {editable ? (
            <input
              style={inputStyle(supplyInvalid)}
              {...numericField(
                register(`lines.${line.id}.supplyQuantity`, numeric),
              )}
            />
          ) : (
            <span className="text-sm">{line.supplyQuantity}</span>
          )}
        </CardRow>
      </div>
      <div className="mt-2">
        <CardRow label={t('label.remaining-to-supply')}>
          <span className="text-sm">{line.remainingQuantityToSupply}</span>
        </CardRow>
      </div>
      <div className="mt-2">
        <CardRow label={t('label.comment')}>
          {editable ? (
            <input
              style={INPUT_BASE}
              {...register(`lines.${line.id}.comment`)}
            />
          ) : (
            <span className="text-sm">{line.comment ?? ''}</span>
          )}
        </CardRow>
      </div>
      {editable ? (
        <div className="mt-2 flex justify-end">
          <Button size="sm" variant="destructive" onClick={onDelete}>
            <Trash2Icon />
            {t('button.delete')}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function AddResponseLineDialog({
  open,
  storeId,
  requisitionId,
  existingItemIds,
  onClose,
  onAdded,
}: {
  open: boolean;
  storeId: string;
  requisitionId: string;
  existingItemIds: string[];
  onClose: () => void;
  onAdded: () => void;
}) {
  const { t } = useTranslation();
  const [item, setItem] = useState<ItemOptionFragment | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setItem(null);
      setError(null);
    }
  }, [open]);

  const insert = useMutation({
    mutationFn: async () => {
      if (!item) return;
      const res = await responseSdk.insertResponseLine({
        storeId,
        input: {
          id: crypto.randomUUID(),
          requisitionId,
          itemId: item.id,
        },
      });
      if (
        res.insertResponseRequisitionLine.__typename ===
        'InsertResponseRequisitionLineError'
      )
        throw new Error(res.insertResponseRequisitionLine.error.description);
    },
    onSuccess: onAdded,
    onError: e => setError(e instanceof Error ? e.message : String(e)),
  });

  return (
    <LineEditDialog
      open={open}
      title={t('heading.add-item')}
      onClose={onClose}
      onOk={() => insert.mutate()}
      okDisabled={!item}
      saving={insert.isPending}
    >
      <div className="flex flex-col gap-4 pt-1">
        <ItemSearchInput
          storeId={storeId}
          value={item}
          onChange={setItem}
          excludeItemIds={existingItemIds}
          autoFocus
        />
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>
    </LineEditDialog>
  );
}
