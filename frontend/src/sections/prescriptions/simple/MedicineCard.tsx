import { For, Match, Switch } from 'solid-js';
import { roundedText, t } from '@/intl';
import { DetailCard } from '@/ui/layout/Detail/DetailCard';
import { Button } from '@/ui/elements/buttons/Button';
import { IconButton } from '@/ui/elements/buttons/IconButton';
import { StatusBadge } from '@/ui/elements/feedback/StatusBadge';
import { AlertCircleIcon, AlertTriangleIcon, PlusCircleIcon } from '@/ui/icons';
import { stockState, type MedicineCard } from './simpleDispensingLogic';
import styles from './SimpleDispensing.module.css';

/*
 * One common medicine on the Simple screen (spec/prescriptions ui-surface S9).
 * The card itself is inert and its buttons act, so a press lands on an amount
 * rather than on "open this medicine".
 */
export const MedicineCardView = (props: {
  card: MedicineCard;
  /** Units still available: the card's stock less what the list holds. */
  available: number;
  /** Whether anything can be added yet: someone has been chosen. */
  canAdd: boolean;
  /** A usual amount pressed. */
  onAmount: (card: MedicineCard, amount: number) => void;
  /** Another amount asked for. */
  onAskAmount: (card: MedicineCard) => void;
}) => {
  const state = () => stockState(props.available, props.card.medicine.amounts);
  const offered = () => props.canAdd && state() !== 'out';
  const unit = () => props.card.item.unitName ?? '';
  const name = () => props.card.item.name;

  return (
    <DetailCard
      title={name()}
      surface="bordered"
      density="compact"
      testId={`common-medicine-card-${props.card.item.id}`}
    >
      <div class={styles.meta}>
        <span class={styles.unit} data-testid="common-medicine-unit">
          {unit()}
        </span>
        {/* Both stock states are the same row-status badge, so they read
            as one kind of thing: the tone escalates and the words say which
            (never colour alone). */}
        <Switch>
          <Match when={state() === 'out'}>
            <StatusBadge
              label={t('label.out-of-stock')}
              tone="error"
              icon={<AlertCircleIcon />}
              testId="common-medicine-stock"
            />
          </Match>
          <Match when={state() === 'low'}>
            {/* The unit as the store set it up, singular or plural: units
                are never pluralised by the app (#666). An item with no unit
                leaves no gap. */}
            <StatusBadge
              label={t('label.low-stock-left', {
                quantity: roundedText(props.available),
                unit: unit(),
              }).replace(/\s+/g, ' ')}
              tone="warning"
              icon={<AlertTriangleIcon />}
              testId="common-medicine-stock"
            />
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
              // More than is left would take the list past what can be given
              // out (rules › the Simple screen).
              disabled={!offered() || amount > props.available}
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
          disabled={!offered()}
          onClick={() => props.onAskAmount(props.card)}
        />
      </div>
    </DetailCard>
  );
};
