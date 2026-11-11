import { For, Show } from 'solid-js';
import { formatCurrency, t, tPlural } from '@/intl';
import { NumberField } from '@/ui/elements/inputs/NumberField';
import { Button } from '@/ui/elements/buttons/Button';
import { IconButton } from '@/ui/elements/buttons/IconButton';
import { TrashIcon } from '@/ui/icons';
import {
  priceOf,
  type ListLine,
  type MedicineCard,
} from './simpleDispensingLogic';
import { StepHeading } from './StepHeading';
import styles from './DispensingList.module.css';

/*
 * The list for the person at the counter (spec/prescriptions ui-surface S9):
 * a panel docked at the body's inline end, with a head (the step, the count,
 * who it is for), the lines as a small table under Item · Qty · Price, and a
 * foot holding the total and the panel's actions. Client state only — nothing
 * is saved until the visit is dispensed. The page owns the lines; this reads
 * them and reports edits.
 *
 * Not the library's static sub-table: its cells hold one line and truncate
 * (spec/ui-standards tables › wrapping), and a medicine's name has to be read
 * whole at the counter, in a column a third of a narrow panel wide.
 */
export const DispensingList = (props: {
  /** The patient's name, once someone is chosen. */
  forName: string | undefined;
  lines: readonly ListLine[];
  /** The card each line's medicine came from — its name, unit and batches. */
  cardOf: (itemId: string) => MedicineCard | undefined;
  onAmount: (itemId: string, units: number | undefined) => void;
  onRemove: (itemId: string) => void;
  /** Empty the list. Nothing was saved, so nothing else changes. */
  onClear: () => void;
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
  const hasLines = () => props.lines.length > 0;

  return (
    <section class={styles.panel} data-testid="dispensing-list">
      <header class={styles.head}>
        <div class={styles.titleRow}>
          <StepHeading n={3} label={t('heading.check-and-dispense')} heading />
          <Show when={hasLines()}>
            <span class={styles.count} data-testid="dispensing-list-count">
              {tPlural('label.medicine-count', props.lines.length)}
            </span>
          </Show>
        </div>
        <p class={styles.for} data-testid="dispensing-list-for">
          {props.forName === undefined
            ? t('label.for-not-chosen-yet')
            : t('label.for-patient', { name: props.forName })}
        </p>
      </header>

      <div class={styles.body}>
        <Show
          when={hasLines()}
          fallback={
            <p class={styles.empty}>{t('messages.no-medicines-added')}</p>
          }
        >
          <table class={styles.lines}>
            <thead>
              <tr>
                <th scope="col">{t('label.item')}</th>
                <th scope="col" data-numeric>
                  {t('label.qty')}
                </th>
                <th scope="col" data-numeric>
                  {t('label.price')}
                </th>
                {/* The remove buttons' column: nothing to head it with. */}
                <td />
              </tr>
            </thead>
            <tbody>
              {/* The page's store rows, keyed by medicine: editing one
                  line's amount never rebuilds its row. */}
              <For each={props.lines}>
                {line => {
                  const card = () => props.cardOf(line.itemId);
                  const name = () => card()?.item.name ?? '';
                  return (
                    <tr data-testid={`dispensing-list-line-${line.itemId}`}>
                      <td>
                        <span class={styles.name}>{name()}</span>
                        <Show when={card()?.item.unitName}>
                          {unit => <span class={styles.unit}>{unit()}</span>}
                        </Show>
                      </td>
                      <td class={styles.qty}>
                        <NumberField
                          label={t('label.amount-of', { item: name() })}
                          hideLabel
                          size="small"
                          // Fills the column, so every line's field is one
                          // width and lines up under its heading.
                          width="full"
                          decimalLimit={2}
                          max={card()?.stock}
                          value={line.units}
                          data-testid="line-amount-input"
                          onChange={units => props.onAmount(line.itemId, units)}
                        />
                      </td>
                      <td data-numeric data-testid="line-price">
                        {formatCurrency(priceOfLine(line))}
                      </td>
                      <td class={styles.remove}>
                        <IconButton
                          icon={<TrashIcon />}
                          size="small"
                          label={t('label.remove-item', { item: name() })}
                          data-testid="remove-line-button"
                          onClick={() => props.onRemove(line.itemId)}
                        />
                      </td>
                    </tr>
                  );
                }}
              </For>
            </tbody>
          </table>
        </Show>
      </div>

      <footer class={styles.foot}>
        <Show when={hasLines()}>
          <div class={styles.total}>
            <span>{t('label.total')}</span>
            <span class={styles.totalValue} data-testid="dispensing-list-total">
              {formatCurrency(total())}
            </span>
          </div>
        </Show>
        {/* The panel's actions, at its inline end — Dispense joins Clear
            here, last. */}
        <div class={styles.actions}>
          <Button
            variant="ghost"
            disabled={!hasLines()}
            data-testid="clear-list-button"
            onClick={() => props.onClear()}
          >
            {t('common.clear')}
          </Button>
        </div>
      </footer>
    </section>
  );
};
