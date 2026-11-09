import { For, Match, Switch } from 'solid-js';
import { roundedText, t } from '@/intl';
import { DetailCard } from '@/ui/layout/Detail/DetailCard';
import { Button } from '@/ui/elements/buttons/Button';
import { IconButton } from '@/ui/elements/buttons/IconButton';
import { Badge } from '@/ui/elements/feedback/Badge';
import { AlertTriangleIcon, PlusCircleIcon } from '@/ui/icons';
import { stockState, type MedicineCard } from './simpleDispensingLogic';
import styles from './SimpleDispensing.module.css';

/*
 * One common medicine on the Simple screen (spec/prescriptions ui-surface S9).
 * The card itself is inert and its buttons act, so a press lands on an amount
 * rather than on "open this medicine".
 */
export const MedicineCardView = (props: {
  card: MedicineCard;
  /** A usual amount pressed. */
  onAmount: (card: MedicineCard, amount: number) => void;
  /** Another amount asked for. */
  onAskAmount: (card: MedicineCard) => void;
}) => {
  const state = () =>
    stockState(props.card.available, props.card.medicine.amounts);
  const unit = () => props.card.item.unitName ?? '';
  const name = () => props.card.item.name;

  return (
    <DetailCard
      title={name()}
      surface="bordered"
      testId={`common-medicine-card-${props.card.item.id}`}
    >
      <div class={styles.meta}>
        <span class={styles.unit} data-testid="common-medicine-unit">
          {unit()}
        </span>
        <Switch>
          <Match when={state() === 'out'}>
            <span data-testid="common-medicine-stock">
              <Badge label={t('label.out-of-stock')} tone="error" />
            </span>
          </Match>
          <Match when={state() === 'low'}>
            <span class={styles.low} data-testid="common-medicine-stock">
              <AlertTriangleIcon />
              {t('label.low-stock-left', {
                quantity: roundedText(props.card.available),
              })}
            </span>
          </Match>
        </Switch>
      </div>
      <div class={styles.amounts}>
        {/* The visible label is the bare number, which keeps the grid
            scannable; the accessible name carries the whole action. */}
        <For each={props.card.medicine.amounts}>
          {amount => (
            <Button
              variant="secondary"
              data-testid="amount-button"
              disabled={state() === 'out'}
              aria-label={t('label.give-amount-of', {
                quantity: roundedText(amount),
                unit: unit(),
                item: name(),
              })}
              onClick={() => props.onAmount(props.card, amount)}
            >
              {roundedText(amount)}
            </Button>
          )}
        </For>
        <IconButton
          icon={<PlusCircleIcon />}
          bordered
          class={
            props.card.medicine.amounts.length > 0 ? styles.another : undefined
          }
          label={t('label.give-another-amount-of', { item: name() })}
          data-testid="another-amount-button"
          disabled={state() === 'out'}
          onClick={() => props.onAskAmount(props.card)}
        />
      </div>
    </DetailCard>
  );
};
