import { For, Show } from 'solid-js';
import { formatCurrency, t } from '@/intl';
import { NumberField } from '@/ui/elements/inputs/NumberField';
import { IconButton } from '@/ui/elements/buttons/IconButton';
import { TrashIcon } from '@/ui/icons';
import {
  priceOf,
  type ListLine,
  type MedicineCard,
} from './simpleDispensingLogic';
import { StepHeading } from './StepHeading';
import styles from './SimpleDispensing.module.css';

/*
 * The list for the person at the counter (spec/prescriptions ui-surface S9):
 * one line per medicine with its total and price, and the total under them.
 * Client state only — nothing is saved until the visit is dispensed. The
 * page owns the lines; this reads them and reports edits.
 */
export const DispensingList = (props: {
  /** The patient's name, once someone is chosen. */
  forName: string | undefined;
  lines: readonly ListLine[];
  /** The card each line's medicine came from — its name, unit and batches. */
  cardOf: (itemId: string) => MedicineCard | undefined;
  onAmount: (itemId: string, units: number | undefined) => void;
  onRemove: (itemId: string) => void;
}) => {
  const priceOfLine = (line: ListLine): number => {
    const card = props.cardOf(line.itemId);
    return card ? priceOf(card.batches, line.units) : 0;
  };
  const total = () => {
    let sum = 0;
    for (const line of props.lines) sum += priceOfLine(line);
    return sum;
  };

  return (
    <section class={styles.listPanel} data-testid="dispensing-list">
      <StepHeading n={3} label={t('heading.check-and-dispense')} heading />
      <p class={styles.listFor} data-testid="dispensing-list-for">
        {props.forName === undefined
          ? t('label.for-not-chosen-yet')
          : t('label.for-patient', { name: props.forName })}
      </p>
      <Show
        when={props.lines.length > 0}
        fallback={
          <p class={styles.listEmpty}>{t('messages.no-medicines-added')}</p>
        }
      >
        <ul class={styles.lines}>
          <For each={props.lines}>
            {line => {
              const card = () => props.cardOf(line.itemId);
              const name = () => card()?.item.name ?? '';
              return (
                <li
                  class={styles.line}
                  data-testid={`dispensing-list-line-${line.itemId}`}
                >
                  <span class={styles.lineName}>{name()}</span>
                  <NumberField
                    label={t('label.amount-of', { item: name() })}
                    hideLabel
                    size="small"
                    // Fills its column, so every line's field is one width
                    // whatever its unit.
                    width="full"
                    decimalLimit={2}
                    endAdornment={card()?.item.unitName ?? undefined}
                    max={card()?.stock}
                    value={line.units}
                    data-testid="line-amount-input"
                    onChange={units => props.onAmount(line.itemId, units)}
                  />
                  <span class={styles.linePrice} data-testid="line-price">
                    {formatCurrency(priceOfLine(line))}
                  </span>
                  <IconButton
                    icon={<TrashIcon />}
                    size="small"
                    label={t('label.remove-item', { item: name() })}
                    data-testid="remove-line-button"
                    onClick={() => props.onRemove(line.itemId)}
                  />
                </li>
              );
            }}
          </For>
        </ul>
        <div class={styles.total}>
          <span>{t('label.total')}</span>
          <span data-testid="dispensing-list-total">
            {formatCurrency(total())}
          </span>
        </div>
      </Show>
    </section>
  );
};
