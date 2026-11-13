import { For, Match, Show, Switch } from 'solid-js';
import { roundedText, t } from '@/intl';
import { DetailCard } from '@/ui/layout/Detail/DetailCard';
import { Button } from '@/ui/elements/buttons/Button';
import { IconButton } from '@/ui/elements/buttons/IconButton';
import { StatusBadge } from '@/ui/elements/feedback/StatusBadge';
import {
  AlertCircleIcon,
  AlertTriangleIcon,
  CheckIcon,
  PlusCircleIcon,
} from '@/ui/icons';
import { stockState, type MedicineCard } from './simpleDispensingLogic';
import styles from './SimpleDispensing.module.css';

/*
 * One common medicine on the Simple screen (spec/prescriptions ui-surface S9).
 * The card itself is inert and its buttons act, so a press lands on an amount
 * rather than on "open this medicine". On a phone it is one row — the name and
 * its lines at the inline start, the amounts at the inline end — so about twice
 * as many fit on the screen.
 */
export const MedicineCardView = (props: {
  card: MedicineCard;
  /**
   * Units still available: the card's stock less what the list holds. Below
   * zero when Dispense found less stock than the list holds.
   */
  available: number;
  /** Units of it the list holds. */
  listed: number;
  /** A phone: the card is one row (the page's viewport query). */
  oneRow: boolean;
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
      layout={props.oneRow ? 'inline' : 'stacked'}
      testId={`common-medicine-card-${props.card.item.id}`}
      meta={
        <>
          <span data-testid="common-medicine-unit">{unit()}</span>
          {/* Both stock states are the same row-status badge, so they read
              as one kind of thing: the tone escalates and the words say which
              (never colour alone). */}
          <Switch>
            {/* Dispense found less stock than the list holds (rules ›
                dispensing the visit): how much the list is short of it. */}
            <Match when={props.available < 0}>
              <StatusBadge
                label={t('label.units-short', {
                  quantity: roundedText(-props.available),
                  unit: unit(),
                }).replace(/\s+/g, ' ')}
                tone="error"
                icon={<AlertCircleIcon />}
                testId="common-medicine-short"
              />
            </Match>
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
          {/* What the list holds of it, so a press visibly does something
              where the list is out of sight. Hidden by the CSS where the list
              is docked beside the cards: there it would repeat the list. */}
          <Show when={props.listed > 0}>
            <StatusBadge
              class={styles.onList}
              label={t('label.on-the-list', {
                quantity: roundedText(props.listed),
                unit: unit(),
              }).replace(/\s+/g, ' ')}
              tone="info"
              icon={<CheckIcon />}
              testId="common-medicine-on-list"
            />
          </Show>
        </>
      }
    >
      <div class={styles.amounts} data-one-row={props.oneRow ? '' : undefined}>
        {/* The visible label is the bare number, which keeps the grid
            scannable; the accessible name carries the whole action. */}
        <For each={props.card.medicine.amounts}>
          {amount => (
            <Button
              variant="secondary"
              class={styles.key}
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
            props.card.medicine.amounts.length > 0
              ? `${styles.key} ${styles.another}`
              : styles.key
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
