import { createResource, createSignal, Match, Show, Switch } from 'solid-js';
import {
  graphqlFetch,
  isForbidden,
  missingPermissions,
  reportPermissionDenied,
} from '@/api/graphql';
import { gated } from '@/api/gated';
import { rejectionFrom } from '@/api/rejection';
import { roundedText, t, type LocaleKey } from '@/intl';
import { translateServerError } from '@/intl/intlUtils';
import { prescriptionPreferences } from '@/store/storeContext';
import {
  ReasonSelect,
  reasonOptionsResource,
  reasonsOfKind,
} from '@/domain/reasonOptions';
import { Dialog } from '@/ui/elements/feedback/Dialog';
import { Alert } from '@/ui/elements/feedback/Alert';
import { Button } from '@/ui/elements/buttons/Button';
import { NumberField } from '@/ui/elements/inputs/NumberField';
import { createFocusTarget } from '@/ui/utils/createFocusTarget';
import {
  SimpleCorrectionBatches,
  SimpleCorrectStock,
} from './correctStock.generated';
import {
  canSaveCount,
  correctionBatch,
  correctionPacks,
  correctionReason,
  countSame,
  countTooLow,
  systemFigure,
} from './simpleDispensingLogic';
import styles from './SimpleDispensing.module.css';

/*
 * Correct the stock where the system's figure stops staff (rules › correcting
 * the stock): the button for staff who may adjust stock, or, for anyone
 * else, who can.
 */
export const CorrectStockAction = (props: {
  allowed: boolean;
  /** While the visit is locked (Dispense saving). */
  disabled?: boolean;
  variant?: 'secondary' | 'ghost';
  onCorrect: () => void;
}) => (
  <Show
    when={props.allowed}
    fallback={
      <span class={styles.correctHint} data-testid="correct-stock-hint">
        {t('messages.ask-someone-to-correct-stock')}
      </span>
    }
  >
    <Button
      variant={props.variant ?? 'secondary'}
      size="small"
      disabled={props.disabled}
      data-testid="correct-stock-button"
      onClick={() => props.onCorrect()}
    >
      {t('button.correct-the-stock')}
    </Button>
  </Show>
);

/*
 * Correct the stock (spec/prescriptions ui-surface S9, rules › correcting the
 * stock): a count of one medicine, for when the shelf holds more than the
 * system shows. The count becomes the system's figure; the difference is
 * saved at once as an inventory addition on the batch dispensing may take
 * with the nearest expiry. Nothing about the visit is saved here.
 */
export const CorrectStockDialog = (props: {
  storeId: string;
  itemId: string;
  name: string;
  /** The unit as set up, never pluralised (#666); empty with none. */
  unit: string;
  onClose: () => void;
  /** Saved: the count is now the system's figure. */
  onSaved: (count: number) => void;
}) => {
  const [count, setCount] = createSignal<number | undefined>();
  const [reasonId, setReasonId] = createSignal<string | undefined>();
  const [saving, setSaving] = createSignal(false);
  const [error, setError] = createSignal<string | undefined>();
  // A save lost its reply and the stock couldn't be read after it, so it may
  // have landed: saving again could add the stock twice.
  const [unsure, setUnsure] = createSignal(false);
  const countField = createFocusTarget();

  // The medicine's batches, or null when they couldn't be read. Background:
  // an unread stock is this dialog's to say, and the app's error dialog would
  // offer a reload that loses the visit.
  const readBatches = async () => {
    const result = await graphqlFetch(
      SimpleCorrectionBatches,
      { storeId: props.storeId, itemId: props.itemId },
      { background: true }
    );
    if (result.kind !== 'success') return null;
    const lines = result.data.stockLines;
    return lines.__typename === 'StockLineConnector' ? lines.nodes : null;
  };

  // Read when the dialog opens, and again at Save, so the difference saved is
  // from the system's figure at that moment. Opened by a press on an open
  // screen, so read without suspending (gated): a suspend would remount the
  // screen under it and lose the visit's inputs.
  const [batches, { mutate: setBatches }] = createResource(readBatches);
  const read = () => gated(batches);
  const unread = () => batches.state === 'ready' && read() === null;
  const figure = () => systemFigure(read() ?? [], prescriptionPreferences());
  const batch = () => correctionBatch(read() ?? [], prescriptionPreferences());

  // The reason it carries: staff choose only when there are several.
  const reasons = () => reasonsOfKind('positive');
  const reason = () => correctionReason(reasons());
  const reasonToSend = () => {
    const r = reason();
    return r.ask ? reasonId() : r.reasonId;
  };

  const unitText = (key: LocaleKey, values: Record<string, string>) =>
    t(key, { ...values, unit: props.unit }).replace(/\s+/g, ' ');

  const canSave = () =>
    !saving() &&
    !unsure() &&
    !!batch() &&
    // A store's reasons still loading would send none, which the server
    // refuses where some exist.
    !reasonOptionsResource.loading() &&
    canSaveCount(count(), figure()) &&
    (!reason().ask || reasonId() !== undefined);

  const save = async () => {
    const counted = count();
    if (!canSave() || counted === undefined) return;
    setSaving(true);
    setError(undefined);
    try {
      await saveCount(counted);
    } finally {
      setSaving(false);
    }
  };

  const saveCount = async (counted: number) => {
    // The stock again, as it is now: the counter may have given some out, or
    // stock come in, since the dialog opened. The dialog then shows this
    // figure, and if the count is no longer above it, the count field says
    // why, and nothing is saved.
    const now = await readBatches();
    if (now === null) return setError(t('error.correct-stock-not-read'));
    setBatches(now);
    const prefs = prescriptionPreferences();
    const shown = systemFigure(now, prefs);
    const target = correctionBatch(now, prefs);
    if (!target || !canSaveCount(counted, shown)) return;
    const result = await graphqlFetch(
      SimpleCorrectStock,
      {
        storeId: props.storeId,
        input: {
          stockLineId: target.id,
          adjustment: correctionPacks(counted, shown, target.packSize),
          adjustmentType: 'ADDITION',
          reasonOptionId: reasonToSend() ?? null,
        },
      },
      { returnGraphqlErrors: true, background: true }
    );
    if (result.kind === 'success') {
      const reply = result.data.createInventoryAdjustment;
      if (reply.__typename === 'InvoiceNode') return props.onSaved(counted);
      setError(
        reply.error.__typename === 'AdjustmentReasonNotProvided'
          ? t('error.provide-reason-stock-adjustment')
          : translateServerError(reply.error.__typename)
      );
      return;
    }
    if (result.kind === 'graphqlError') {
      if (isForbidden(result.errors))
        reportPermissionDenied(missingPermissions(result.errors));
      setError(
        rejectionFrom(result.errors, t('error.correct-stock-failed')).message
      );
      return;
    }
    // No reply (a timeout, a dropped connection): the save may have landed.
    // Find out from the stock before saying it failed or letting it be saved
    // again, which would add the difference twice (rules › correcting the
    // stock).
    const after = await readBatches();
    if (after === null) {
      setUnsure(true);
      return setError(t('error.correct-stock-unsure'));
    }
    setBatches(after);
    if (!canSaveCount(counted, systemFigure(after, prefs)))
      return props.onSaved(counted);
    setError(t('error.correct-stock-failed'));
  };

  return (
    <Dialog
      open
      onClose={() => props.onClose()}
      dismissable={!saving()}
      title={t('heading.correct-the-stock')}
      width="form"
      testId="correct-stock-modal"
      initialFocus={countField}
      actionsLead={
        <Show when={error()}>
          {message => (
            <Alert severity="error" compact testId="correct-stock-error">
              {message()}
            </Alert>
          )}
        </Show>
      }
      actions={
        <>
          <Button
            variant="secondary"
            confirms="cancel"
            disabled={saving()}
            data-testid="dialog-button-cancel"
            onClick={() => props.onClose()}
          >
            {t('button.cancel')}
          </Button>
          <Button
            confirms="plain"
            disabled={!canSave()}
            loading={saving()}
            data-testid="dialog-button-save"
            onClick={() => void save()}
          >
            {t('button.save')}
          </Button>
        </>
      }
    >
      <div class={styles.amountBox}>
        <p class={styles.correctFigure}>
          <strong>{props.name}</strong>
          <br />
          <span data-testid="correct-stock-figure">
            <Show when={read()} fallback={t('loading')}>
              {figure() > 0
                ? unitText('messages.correct-stock-shows', {
                    quantity: roundedText(figure()),
                  })
                : t('messages.correct-stock-shows-none')}
            </Show>
          </span>
        </p>
        <Switch>
          <Match when={unread()}>
            <Alert severity="error" compact testId="correct-stock-not-read">
              {t('error.correct-stock-not-read')}
            </Alert>
          </Match>
          <Match when={read() && !batch()}>
            <Alert severity="warning" compact testId="correct-stock-no-batch">
              {t('messages.correct-stock-no-batch', { item: props.name })}
            </Alert>
          </Match>
          <Match when={read()}>
            <NumberField
              ref={countField.ref}
              label={unitText('label.how-many-are-there', {})}
              width="short"
              decimalLimit={2}
              endAdornment={props.unit || undefined}
              disabled={saving()}
              value={count()}
              onChange={setCount}
              error={
                countTooLow(count(), figure())
                  ? t('messages.correct-stock-lower')
                  : undefined
              }
              errorTestId="correct-stock-count-error"
              warning={
                countSame(count(), figure())
                  ? t('messages.correct-stock-same')
                  : undefined
              }
              warningTestId="correct-stock-count-same"
              // What to count: the figure leaves out stock dispensing can't
              // take, so counting it would add stock that isn't there to give.
              helperText={t('messages.correct-stock-what-to-count')}
              data-testid="correct-stock-count-input"
            />
            <Show when={reason().ask}>
              <ReasonSelect
                kind="positive"
                label={t('label.reason')}
                required
                disabled={saving()}
                value={reasonId()}
                placeholder={t('label.select-reason')}
                inputTestId="correct-stock-reason"
                onChange={r => setReasonId(r?.id)}
              />
            </Show>
          </Match>
        </Switch>
      </div>
    </Dialog>
  );
};
