import { createSignal, For, Show } from 'solid-js';
import { roundedText, t, tPlural, type LocaleKey } from '@/intl';
import { Dialog } from '@/ui/elements/feedback/Dialog';
import { Alert } from '@/ui/elements/feedback/Alert';
import { Button } from '@/ui/elements/buttons/Button';
import { NumberField } from '@/ui/elements/inputs/NumberField';
import { createFocusTarget } from '@/ui/utils/createFocusTarget';
import { createMediaQuery } from '@/ui/utils/createMediaQuery';
import {
  amountLimit,
  canAddTyped,
  type MedicineCard,
} from './simpleDispensingLogic';
import { CorrectStockAction } from './CorrectStockDialog';
import styles from './SimpleDispensing.module.css';

/*
 * The amount box (spec/prescriptions ui-surface S9): another amount for one
 * medicine, opened from its card or from the search. Its usual amounts first,
 * then a field for any other. Nothing is saved: an amount goes on the list,
 * and the box closes.
 */
export const AmountDialog = (props: {
  card: MedicineCard;
  /** Units still available: the medicine's stock less what the list holds. */
  available: number;
  /**
   * While the visit is being dispensed nothing can be added (rules ›
   * dispensing the visit).
   */
  locked: boolean;
  /**
   * Correct the stock from the box, when the amount typed is more than is
   * available or none is (rules › correcting the stock). `allowed` false
   * says who can instead. `open` gets the amount typed, which the notice
   * after saving counts as this patient's, and where focus goes once it saves.
   */
  correctStock: {
    allowed: boolean;
    open: (typed: number, refocus: () => void) => void;
  };
  onAdd: (units: number) => void;
  onClose: () => void;
}) => {
  const [typed, setTyped] = createSignal<number | undefined>();
  const amountField = createFocusTarget();
  const isTouch = createMediaQuery('(pointer: coarse)');

  const unit = () => props.card.item.unitName ?? '';
  const name = () => props.card.item.name;
  const amounts = () => props.card.medicine.amounts;
  const none = () => props.available <= 0;
  const tooMany = () => (typed() ?? 0) > props.available;
  const canAdd = () => !props.locked && canAddTyped(typed(), props.available);

  const add = () => {
    const units = typed();
    if (units !== undefined && canAdd()) props.onAdd(units);
  };

  // The unit as the store set it up, singular or plural: units are never
  // pluralised by the app (#666). An item with no unit leaves no gap.
  const amountText = (key: LocaleKey, quantity: number) =>
    t(key, { quantity: roundedText(quantity), unit: unit() }).replace(
      /\s+/g,
      ' '
    );

  // Why a typed amount can't be added (rules › another amount, and other
  // medicines): the stock the system shows, and, once the list holds some of
  // it, how much that is and how much can still be added.
  const limitText = () => {
    const limit = amountLimit(props.card.stock, props.available);
    if (limit.selected <= 0)
      return amountText('messages.system-shows-only', limit.stock);
    return tPlural('messages.system-shows-only-selected', limit.selected, {
      quantity: roundedText(limit.stock),
      unit: unit(),
      selected: roundedText(limit.selected),
      available: roundedText(limit.upTo),
    }).replace(/\s+/g, ' ');
  };

  // Under the field's error, or the notice that none is available.
  const correctAction = () => (
    <div>
      <CorrectStockAction
        allowed={props.correctStock.allowed}
        disabled={props.locked}
        onCorrect={() =>
          props.correctStock.open(typed() ?? 0, () => amountField.focus())
        }
      />
    </div>
  );

  return (
    <Dialog
      open
      onClose={() => props.onClose()}
      title={name()}
      width="form"
      testId="amount-modal"
      // With none available there is no field to land in.
      initialFocus={none() ? undefined : amountField}
      description={
        <span data-testid="amount-modal-stock">
          {props.card.item.code} ·{' '}
          {amountText('label.amount-available', Math.max(props.available, 0))}
        </span>
      }
      actions={
        <>
          <Button
            variant="secondary"
            confirms="cancel"
            data-testid="dialog-button-cancel"
            onClick={() => props.onClose()}
          >
            {t('button.cancel')}
          </Button>
          <Button
            confirms="plain"
            disabled={!canAdd()}
            data-testid="add-to-list-button"
            onClick={add}
          >
            {t('button.add-to-list')}
          </Button>
        </>
      }
    >
      <Show
        when={!none()}
        fallback={
          <div class={styles.amountBox}>
            <Alert severity="warning" compact testId="amount-modal-none">
              {t('messages.none-available', { item: name() })}
            </Alert>
            {correctAction()}
          </div>
        }
      >
        <div class={styles.amountBox}>
          <Show when={amounts().length > 0}>
            <div class={styles.amountChoices}>
              <span class={styles.amountChoicesLabel}>
                {t('label.choose-an-amount')}
              </span>
              <div class={styles.amounts}>
                {/* As on the card: the bare number, with the whole action as
                    the accessible name. */}
                <For each={amounts()}>
                  {amount => (
                    <Button
                      variant="secondary"
                      class={styles.key}
                      data-testid="amount-modal-amount-button"
                      disabled={props.locked || amount > props.available}
                      aria-label={t('label.give-amount-of', {
                        quantity: roundedText(amount),
                        unit: unit(),
                        item: name(),
                      })}
                      onClick={() => props.onAdd(amount)}
                    >
                      {roundedText(amount)}
                    </Button>
                  )}
                </For>
              </div>
            </div>
          </Show>
          <NumberField
            ref={amountField.ref}
            label={t(
              amounts().length > 0
                ? 'label.or-type-an-amount'
                : 'label.type-an-amount'
            )}
            size={isTouch() ? 'default' : 'small'}
            width="short"
            decimalLimit={2}
            endAdornment={unit() || undefined}
            value={typed()}
            onChange={setTyped}
            // Not clamped to what's available: the field says why the amount
            // can't be added rather than quietly changing it.
            error={tooMany() ? limitText() : undefined}
            errorTestId="amount-modal-error"
            data-testid="amount-modal-input"
          />
          <Show when={tooMany()}>{correctAction()}</Show>
        </div>
      </Show>
    </Dialog>
  );
};
