import {
  createEffect,
  createSignal,
  createUniqueId,
  For,
  Show,
} from 'solid-js';
import { formatCurrency, t, tPlural } from '@/intl';
import { NumberField } from '@/ui/elements/inputs/NumberField';
import { Button } from '@/ui/elements/buttons/Button';
import { IconButton } from '@/ui/elements/buttons/IconButton';
import { Alert } from '@/ui/elements/feedback/Alert';
import { CheckCircleIcon, ChevronDownIcon, TrashIcon } from '@/ui/icons';
import { createMediaQuery } from '@/ui/utils/createMediaQuery';
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
 * On a phone it is a bar pinned to the bottom of the screen instead — the
 * count, the total and Dispense, always in view — whose toggle opens the whole
 * list as a sheet over the cards (ui-surface S9 › the list on a phone). The
 * same element at every width: the CSS restyles it, so crossing the line or
 * opening the sheet never rebuilds a line's amount field. The open state is
 * this component's own: the page only says whether it is a phone.
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
  /** Save the visit (rules › dispensing the visit). */
  onDispense: () => void;
  /** Someone is chosen, so there is someone to dispense to. */
  canDispense: boolean;
  /** A save is in flight. */
  dispensing: boolean;
  /**
   * A save is in flight or its reply was lost: the lines can't change, and
   * only Dispense is offered (rules › dispensing the visit).
   */
  locked: boolean;
  /**
   * What the last Dispense did: who it went to, or why it failed. Shown in
   * the list itself — never a toast (ui-standards › action feedback).
   */
  notice?: { severity: 'success' | 'error'; text: string };
  /** A phone: the list is the bottom bar and its sheet. */
  isPhone: boolean;
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

  // The phone's sheet. Closed whenever the screen is not a phone, so it opens
  // closed if the screen turns back into one.
  const [open, setOpen] = createSignal(false);
  createEffect(() => {
    if (!props.isPhone) setOpen(false);
  });
  const sheetOpen = () => props.isPhone && open();
  let toggle: HTMLButtonElement | undefined;
  const close = () => {
    setOpen(false);
    toggle?.focus();
  };
  const sheetId = createUniqueId();

  // A touch screen: each line's amount field at the touch height of the
  // standard size, to match the keys on the cards (ui-surface S9 › touch).
  const isTouch = createMediaQuery('(pointer: coarse)');

  const dispenseButton = (testId: string, cls?: string) => (
    <Button
      class={cls}
      icon={<CheckCircleIcon />}
      disabled={!hasLines() || !props.canDispense}
      loading={props.dispensing}
      data-testid={testId}
      onClick={() => props.onDispense()}
    >
      {t('button.dispense')}
    </Button>
  );

  return (
    <>
      {/* Behind the open sheet: dims the cards, and a press on them closes it.
          Not focusable — Escape and the toggle are the keyboard's ways out. */}
      <Show when={sheetOpen()}>
        <div class={styles.scrim} aria-hidden="true" onClick={close} />
      </Show>
      <section
        class={styles.panel}
        data-open={sheetOpen() ? '' : undefined}
        data-testid="dispensing-list"
        /*
         * The open sheet's Escape rung. A real listener (`on:`), not a
         * delegated one, so consuming the key here stops the global rung's
         * navigate-up (as Page's side panel does). Only while the sheet is
         * open: a docked list must not swallow Escape.
         */
        on:keydown={event => {
          if (event.key !== 'Escape' || !sheetOpen()) return;
          event.preventDefault();
          event.stopPropagation();
          close();
        }}
      >
        {/* The phone's bar (hidden by the CSS above a phone): the toggle,
            then Dispense while the sheet is closed — open, the foot has it. */}
        <div class={styles.bar}>
          <button
            ref={toggle}
            type="button"
            class={styles.toggle}
            aria-expanded={sheetOpen()}
            aria-controls={sheetId}
            data-testid="dispensing-list-toggle"
            onClick={() => setOpen(!open())}
          >
            <ChevronDownIcon class={styles.chevron} aria-hidden="true" />
            {/* Its name says what it opens: the step, then what is on it. */}
            <span class={styles.visuallyHidden}>
              {t('heading.check-and-dispense')}
            </span>
            <span class={styles.barCount} data-testid="dispensing-bar-count">
              {hasLines()
                ? tPlural('label.medicine-count', props.lines.length)
                : t('label.nothing-on-the-list')}
            </span>
            <Show when={hasLines()}>
              <span class={styles.barTotal} data-testid="dispensing-bar-total">
                {formatCurrency(total())}
              </span>
            </Show>
          </button>
          {dispenseButton('dispensing-bar-dispense-button', styles.barAction)}
        </div>

        {/* What the last Dispense did: above the bar on a phone, so it shows
            with the sheet closed; under the head where the list is docked. */}
        <Show when={props.notice}>
          {notice => (
            <div class={styles.notice}>
              <Alert
                severity={notice().severity}
                compact
                testId="dispense-notice"
              >
                {notice().text}
              </Alert>
            </div>
          )}
        </Show>

        {/* The list itself: the panel's whole content where it is docked,
            the sheet the bar opens on a phone. */}
        <div id={sheetId} class={styles.sheet}>
          <header class={styles.head}>
            <div class={styles.titleRow}>
              <StepHeading
                n={3}
                label={t('heading.check-and-dispense')}
                heading
              />
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
                              {unit => (
                                <span class={styles.unit}>{unit()}</span>
                              )}
                            </Show>
                          </td>
                          <td class={styles.qty}>
                            <NumberField
                              label={t('label.amount-of', { item: name() })}
                              hideLabel
                              size={isTouch() ? 'default' : 'small'}
                              // Fills the column, so every line's field is one
                              // width and lines up under its heading.
                              width="full"
                              decimalLimit={2}
                              max={card()?.stock}
                              disabled={props.locked}
                              value={line.units}
                              data-testid="line-amount-input"
                              onChange={units =>
                                props.onAmount(line.itemId, units)
                              }
                            />
                          </td>
                          <td data-numeric data-testid="line-price">
                            {formatCurrency(priceOfLine(line))}
                          </td>
                          <td class={styles.remove}>
                            <IconButton
                              icon={<TrashIcon />}
                              size="small"
                              class={styles.removeButton}
                              label={t('label.remove-item', { item: name() })}
                              data-testid="remove-line-button"
                              disabled={props.locked}
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
                <span
                  class={styles.totalValue}
                  data-testid="dispensing-list-total"
                >
                  {formatCurrency(total())}
                </span>
              </div>
            </Show>
            {/* The panel's actions, at its inline end, Dispense last. */}
            <div class={styles.actions}>
              <Button
                variant="ghost"
                disabled={!hasLines() || props.locked}
                data-testid="clear-list-button"
                onClick={() => props.onClear()}
              >
                {t('common.clear')}
              </Button>
              {dispenseButton('dispense-button')}
            </div>
          </footer>
        </div>
      </section>
    </>
  );
};
