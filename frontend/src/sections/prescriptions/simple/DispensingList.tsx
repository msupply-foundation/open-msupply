import {
  createEffect,
  createSignal,
  createUniqueId,
  For,
  Show,
  type JSX,
} from 'solid-js';
import {
  formatCurrency,
  roundedText,
  t,
  tPlural,
  type LocaleKey,
} from '@/intl';
import { NumberField } from '@/ui/elements/inputs/NumberField';
import { Button } from '@/ui/elements/buttons/Button';
import { LinkButton } from '@/ui/elements/buttons/LinkButton';
import { IconButton } from '@/ui/elements/buttons/IconButton';
import { Alert } from '@/ui/elements/feedback/Alert';
import { Popover } from '@/ui/elements/feedback/Popover';
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ClockIcon,
  MoreHorizontalIcon,
  TrashIcon,
} from '@/ui/icons';
import { createMediaQuery } from '@/ui/utils/createMediaQuery';
import { createFocusTargets } from '@/ui/utils/createFocusTarget';
import {
  linePrice,
  stockFor,
  type ListLine,
  type MedicineCard,
} from './simpleDispensingLogic';
import type { VisitLine } from './dispensedVisit';
import { StepHeading } from './StepHeading';
import { whoTheListIsFor } from './listHead';
import { CorrectStockAction } from './CorrectStockDialog';
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
/** A dispensed visit, as the list shows it in its place. */
export interface OpenVisit {
  /** When it was dispensed (or cancelled, or created). */
  heading: string;
  /** Who it was for, and their code. Undefined until it is read. */
  forName: string | undefined;
  /** Undefined until it is read; `message` says why. */
  lines: readonly VisitLine[] | undefined;
  total: number | undefined;
  /** In place of the lines: loading, couldn't be read, not found. */
  message?: JSX.Element;
  /** Why it can't be edited, where that is the whole answer. */
  reason?: string;
  /** Its one action (Cancel, or Edit), at the foot's inline end. */
  action?: JSX.Element;
}

/**
 * A dispensed visit being edited (rules › editing a dispensed visit): the
 * list is its medicines, Clear discards the changes, Dispense saves them, and
 * the visit can be deleted.
 */
export interface EditingVisit {
  /** Which visit is being edited, by when it was dispensed. */
  heading: string;
  /** Who it was for, and their code. */
  forName: string | undefined;
  /** Ask to delete it: from the menu, or Save with nothing on the list. */
  onDelete: () => void;
}

export const DispensingList = (props: {
  /** The patient's name, once someone is chosen. */
  forName: string | undefined;
  lines: readonly ListLine[];
  /** The card each line's medicine came from — its name, unit and batches. */
  cardOf: (itemId: string) => MedicineCard | undefined;
  onAmount: (itemId: string, units: number | undefined) => void;
  onRemove: (itemId: string) => void;
  /**
   * Correct the stock of a line's medicine, from a line that stopped at the
   * stock or was left short (rules › correcting the stock). `allowed` false
   * says who can instead. `open` gets where focus goes once it saves: the
   * line's amount, the next thing to change or check.
   */
  correctStock: {
    allowed: boolean;
    open: (itemId: string, refocus: () => void) => void;
  };
  /** Empty the list. Nothing was saved, so nothing else changes. */
  onClear: () => void;
  /** Save the visit (rules › dispensing the visit). */
  onDispense: () => void;
  /** Someone is chosen, so there is someone to dispense to. */
  canDispense: boolean;
  /** A save is in flight: Dispense shows busy. */
  dispensing: boolean;
  /**
   * Clear is looking for a save whose reply was lost: Clear shows busy, and
   * Dispense can't be pressed, so it never saves a list Clear is about to
   * empty (rules › dispensing the visit).
   */
  looking: boolean;
  /**
   * A save is in flight or its reply was lost: the lines can't change, and
   * only Dispense is offered (rules › dispensing the visit).
   */
  locked: boolean;
  /**
   * What the last Dispense did: who it went to, why it failed, or that it
   * stopped on short stock or a changed price. Shown in the list itself —
   * never a toast (ui-standards › action feedback).
   */
  notice?: {
    severity: 'success' | 'info' | 'warning' | 'error';
    text: string;
    /** Where View goes: the visit the message says was dispensed. */
    viewHref?: string;
    /**
     * Just dispensed: where Dispensing records goes. The list says it is
     * ready for the next patient and offers Dispensing records in its foot,
     * as long as the message shows (ui-surface S9 › dispensed).
     */
    recordsHref?: string;
  };
  /** A phone: the list is the bottom bar and its sheet. */
  isPhone: boolean;
  /**
   * A dispensed visit open in the list's place (rules › a dispensed visit):
   * its head, lines and total, read only, and its own actions in place of
   * Clear and Dispense. The list in progress waits, untouched, until it goes.
   */
  visit?: OpenVisit;
  /** A dispensed visit being edited in the list. */
  editing?: EditingVisit;
}) => {
  const priceOfLine = (line: ListLine): number =>
    linePrice(props.cardOf(line.itemId), line.units);
  const total = () => {
    let sum = 0;
    for (const line of props.lines) sum += priceOfLine(line);
    return sum;
  };
  const hasLines = () => props.lines.length > 0;
  // Nothing to check yet: the head's band is muted.
  const nothingListed = () =>
    props.visit ? !props.visit.lines?.length : !hasLines();
  // Just dispensed, with the list docked or wrapped: Dispensing records in
  // the foot. Not on a phone, where the page action is in view.
  const recordsHref = () =>
    props.isPhone ? undefined : props.notice?.recordsHref;
  // The total the panel shows: the dispensed visit's once it is read, else
  // the list's once something is on it.
  const shownTotal = (): number | undefined =>
    props.visit ? props.visit.total : hasLines() ? total() : undefined;

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

  // Each line's amount field, for focus to land on after correcting the stock.
  const amountFields = createFocusTargets();

  // Correct the stock beside a line's message (ui-surface S9).
  const correctAction = (itemId: string, variant: 'secondary' | 'ghost') => (
    <CorrectStockAction
      allowed={props.correctStock.allowed}
      disabled={props.locked}
      variant={variant}
      onCorrect={() =>
        props.correctStock.open(itemId, () => amountFields.focus(itemId))
      }
    />
  );

  // While editing with nothing left on the list, saving means deleting the
  // visit (rules › editing a dispensed visit).
  const deletes = () => props.editing !== undefined && !hasLines();
  // The foot's button names what it does while editing; the phone bar's
  // keeps its one id.
  const dispenseButton = (testId: string, cls?: string, foot = false) => (
    <Button
      class={cls}
      variant={deletes() ? 'danger' : undefined}
      icon={deletes() ? <TrashIcon /> : <CheckCircleIcon />}
      disabled={
        (!hasLines() && !props.editing) || !props.canDispense || props.looking
      }
      loading={props.dispensing}
      data-testid={
        foot && props.editing
          ? deletes()
            ? 'delete-dispense-button'
            : 'save-changes-button'
          : testId
      }
      onClick={() =>
        deletes() ? props.editing?.onDelete() : props.onDispense()
      }
    >
      {props.editing
        ? deletes()
          ? t('button.delete-dispensing-record')
          : t('button.save-changes')
        : t('button.dispense')}
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
              {props.visit
                ? props.visit.heading
                : hasLines()
                  ? tPlural('label.medicine-count', props.lines.length)
                  : t('label.nothing-on-the-list')}
            </span>
            <Show when={shownTotal() !== undefined}>
              <span class={styles.barTotal} data-testid="dispensing-bar-total">
                {formatCurrency(shownTotal() ?? 0)}
              </span>
            </Show>
          </button>
          {/* A dispensed visit has nothing to dispense. */}
          <Show when={!props.visit}>
            {dispenseButton('dispensing-bar-dispense-button', styles.barAction)}
          </Show>
        </div>

        {/* What the last Dispense did: above the bar on a phone, so it shows
            with the sheet closed; under the head where the list is docked. */}
        <Show when={props.notice}>
          {notice => (
            /* A notice naming a visit (just dispensed, or its changes saved
             * or discarded) is the panel's news: a full-width box, with View
             * inside it at its end. Any other is the compact chip.
             */
            <div
              class={styles.notice}
              data-boxed={notice().viewHref ? '' : undefined}
              data-severity={notice().severity}
            >
              <Alert
                severity={notice().severity}
                compact={!notice().viewHref}
                icon={
                  notice().viewHref && notice().severity === 'success'
                    ? CheckCircleIcon
                    : undefined
                }
                class={styles.noticeAlert}
                testId="dispense-notice"
              >
                {notice().text}
              </Alert>
              {/* Beside the message, not in it: the alert is a message
                  panel, with no controls of its own. The box holds both. */}
              <Show when={notice().viewHref}>
                {href => (
                  <LinkButton
                    href={href()}
                    variant="ghost"
                    data-testid="view-dispensed-visit-button"
                  >
                    {t('button.view')}
                  </LinkButton>
                )}
              </Show>
            </div>
          )}
        </Show>

        {/* The list itself: the panel's whole content where it is docked,
            the sheet the bar opens on a phone. */}
        <div id={sheetId} class={styles.sheet}>
          {/* A band in the inverse of the page's colours, so the list is
              found from across the counter; muted while there is nothing on
              it to check. */}
          <header
            class={styles.head}
            data-empty={nothingListed() ? '' : undefined}
          >
            <Show
              when={props.visit}
              fallback={
                <>
                  <div class={styles.titleRow}>
                    {/* Editing, the visit being edited in the step's place,
                        with no number: it is not a step of a new visit. */}
                    <Show
                      when={props.editing}
                      fallback={
                        <StepHeading
                          n={3}
                          label={t('heading.check-and-dispense')}
                          heading
                        />
                      }
                    >
                      {editing => (
                        <h2
                          class={styles.visitHeading}
                          data-testid="editing-dispense-heading"
                        >
                          {editing().heading}
                        </h2>
                      )}
                    </Show>
                    <span class={styles.titleEnd}>
                      <Show when={hasLines()}>
                        <span
                          class={styles.count}
                          data-testid="dispensing-list-count"
                        >
                          {tPlural('label.medicine-count', props.lines.length)}
                        </span>
                      </Show>
                      {/* Delete is rare and can't be undone: out of the foot,
                          behind the menu, so Discard and Save stand alone. */}
                      <Show when={props.editing}>
                        {editing => (
                          <Popover
                            trigger={<MoreHorizontalIcon aria-hidden="true" />}
                            triggerLabel={t('label.more-actions')}
                            triggerClass={styles.moreActions}
                            triggerTestId="edit-more-actions-button"
                            placement="bottom-end"
                          >
                            {closeMenu => (
                              <Button
                                variant="ghost"
                                icon={<TrashIcon />}
                                class={styles.deleteAction}
                                disabled={props.locked}
                                data-testid="delete-dispense-menu-item"
                                onClick={() => {
                                  closeMenu();
                                  editing().onDelete();
                                }}
                              >
                                {t('button.delete-dispensing-record')}
                              </Button>
                            )}
                          </Popover>
                        )}
                      </Show>
                    </span>
                  </div>
                  <p class={styles.for} data-testid="dispensing-list-for">
                    {(() => {
                      const who = whoTheListIsFor(props);
                      return t(who.key, { name: who.name ?? '' });
                    })()}
                  </p>
                </>
              }
            >
              {visit => (
                <>
                  {/* In the step's place, with no number: a dispensed visit
                      is not a step of this one. */}
                  <h2
                    class={styles.visitHeading}
                    data-testid="dispensed-visit-heading"
                  >
                    {visit().heading}
                  </h2>
                  <Show when={visit().forName}>
                    {name => (
                      <p class={styles.for} data-testid="dispensing-list-for">
                        {t('label.for-patient', { name: name() })}
                      </p>
                    )}
                  </Show>
                </>
              )}
            </Show>
          </header>

          <Show when={props.visit}>
            {visit => (
              <div class={styles.body} data-testid="dispensed-visit">
                <Show when={visit().lines} fallback={visit().message}>
                  {lines => (
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
                        </tr>
                      </thead>
                      <tbody>
                        <For each={lines()}>
                          {line => (
                            <tr
                              data-testid={`dispensed-visit-line-${line.itemId}`}
                            >
                              <td>
                                <span class={styles.name}>{line.name}</span>
                                <Show when={line.unit}>
                                  {unit => (
                                    <span class={styles.unit}>{unit()}</span>
                                  )}
                                </Show>
                              </td>
                              <td data-numeric data-testid="line-amount">
                                {line.units === undefined
                                  ? ''
                                  : roundedText(line.units)}
                              </td>
                              <td data-numeric data-testid="line-price">
                                {formatCurrency(line.price)}
                              </td>
                            </tr>
                          )}
                        </For>
                      </tbody>
                    </table>
                  )}
                </Show>
              </div>
            )}
          </Show>

          <Show when={!props.visit}>
            <div class={styles.body}>
              <Show
                when={hasLines()}
                fallback={
                  <Show
                    when={props.notice?.recordsHref}
                    fallback={
                      <p
                        class={styles.empty}
                        data-testid="dispensing-list-empty"
                      >
                        {t('messages.nothing-yet-press-an-amount')}
                      </p>
                    }
                  >
                    {/* Just dispensed: the next visit starts on the cards,
                        which the arrow points to. */}
                    <div
                      class={styles.ready}
                      data-testid="ready-for-next-patient"
                    >
                      <ArrowLeftIcon
                        class={styles.readyArrow}
                        aria-hidden="true"
                      />
                      <div>
                        <p class={styles.readyHeading}>
                          {t('heading.ready-for-next-patient')}
                        </p>
                        <p class={styles.readyHint}>
                          {t('messages.press-an-amount-to-start')}
                        </p>
                      </div>
                    </div>
                  </Show>
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
                  {/* The page's store rows, keyed by medicine: editing one
                    line's amount never rebuilds its row. Each line is a body
                    of its own, so what it has to say sits under it. */}
                  <For each={props.lines}>
                    {line => {
                      const card = () => props.cardOf(line.itemId);
                      const name = () => card()?.item.name ?? '';
                      const unit = () => card()?.item.unitName ?? '';
                      const stock = () => stockFor(card(), line.units);
                      // The unit as set up, never pluralised (#666); an item
                      // with no unit leaves no gap.
                      const amountText = (key: LocaleKey, quantity: number) =>
                        t(key, {
                          quantity: roundedText(quantity),
                          unit: unit(),
                        }).replace(/\s+/g, ' ');
                      return (
                        <tbody
                          data-testid={`dispensing-list-line-${line.itemId}`}
                        >
                          <tr>
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
                                // Fills the column, so every line's field
                                // is one width and lines up under its
                                // heading.
                                width="full"
                                decimalLimit={2}
                                // No max: the page stops an amount at the stock
                                // itself, so the line can say why. It answers
                                // inside onChange, even with the value it held.
                                parentAnswersSynchronously
                                disabled={props.locked}
                                value={line.units}
                                ref={amountFields.ref(line.itemId)}
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
                          {/* Typed above the stock: the amount stopped there,
                            and this says why. */}
                          <Show when={line.capped && line.units <= stock()}>
                            <tr class={styles.note}>
                              <td colSpan={4}>
                                <div class={styles.limitRow}>
                                  <p
                                    class={styles.limit}
                                    data-testid="line-stock-limit"
                                  >
                                    {amountText(
                                      'messages.only-units-in-stock',
                                      stock()
                                    )}
                                  </p>
                                  {correctAction(line.itemId, 'secondary')}
                                </div>
                              </td>
                            </tr>
                          </Show>
                          {/* Dispense found less stock than the line holds:
                            nothing was saved, and staff choose. */}
                          <Show when={line.units > stock()}>
                            <tr class={styles.note}>
                              <td colSpan={4}>
                                <div
                                  class={styles.lineWarning}
                                  data-testid="line-stock-warning"
                                >
                                  <p>
                                    <strong>
                                      {t('messages.stock-went-down')}
                                    </strong>{' '}
                                    {stock() > 0
                                      ? amountText(
                                          'messages.stock-now-shows',
                                          stock()
                                        )
                                      : t('messages.stock-now-shows-none')}
                                  </p>
                                  <div class={styles.lineActions}>
                                    <Show
                                      when={stock() > 0}
                                      fallback={
                                        <Button
                                          variant="secondary"
                                          size="small"
                                          disabled={props.locked}
                                          data-testid="line-warning-remove-button"
                                          onClick={() =>
                                            props.onRemove(line.itemId)
                                          }
                                        >
                                          {t('label.remove')}
                                        </Button>
                                      }
                                    >
                                      <Button
                                        variant="secondary"
                                        size="small"
                                        disabled={props.locked}
                                        data-testid="give-instead-button"
                                        onClick={() =>
                                          props.onAmount(line.itemId, stock())
                                        }
                                      >
                                        {t('button.give-instead', {
                                          quantity: roundedText(stock()),
                                        })}
                                      </Button>
                                    </Show>
                                    {correctAction(line.itemId, 'ghost')}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          </Show>
                          {/* Dispense found the line's price changed: nothing
                            was saved, and staff check the total. A short
                            line says it is short instead. */}
                          <Show when={line.repriced && line.units <= stock()}>
                            <tr class={styles.note}>
                              <td colSpan={4}>
                                <div
                                  class={styles.lineWarning}
                                  data-testid="line-price-warning"
                                >
                                  <p>
                                    <strong>
                                      {t('messages.price-changed')}
                                    </strong>{' '}
                                    {t('messages.price-now', {
                                      price: formatCurrency(priceOfLine(line)),
                                    })}
                                  </p>
                                </div>
                              </td>
                            </tr>
                          </Show>
                        </tbody>
                      );
                    }}
                  </For>
                </table>
              </Show>
            </div>
          </Show>

          <footer class={styles.foot}>
            <Show when={shownTotal() !== undefined}>
              <div class={styles.total}>
                <span>{t('label.total')}</span>
                <span
                  class={styles.totalValue}
                  data-testid="dispensing-list-total"
                >
                  {formatCurrency(shownTotal() ?? 0)}
                </span>
              </div>
            </Show>
            {/* The panel's actions, at its inline end, Dispense last; a
                dispensed visit's own in their place. */}
            <Show when={props.visit}>
              {visit => (
                <Show when={visit().reason || visit().action}>
                  <div class={styles.actions}>
                    <Show when={visit().reason}>
                      {reason => (
                        <p
                          class={styles.reason}
                          data-testid="dispensed-visit-reason"
                        >
                          {reason()}
                        </p>
                      )}
                    </Show>
                    {visit().action}
                  </div>
                </Show>
              )}
            </Show>
            <Show when={!props.visit}>
              <div class={styles.actions}>
                {/* Just dispensed: the way to past visits, at the inline
                    start, away from Dispense. */}
                <Show when={recordsHref()}>
                  {href => (
                    <LinkButton
                      href={href()}
                      variant="ghost"
                      icon={<ClockIcon />}
                      class={styles.recordsLink}
                      data-testid="list-dispensing-records-button"
                    >
                      {t('button.dispensing-records')}
                    </LinkButton>
                  )}
                </Show>
                {/* Hidden, not disabled, with nothing to clear (ui-surface S9).
                    While editing it discards the changes, so it is always
                    there. */}
                <Show
                  when={props.editing}
                  fallback={
                    <Show when={hasLines()}>
                      <Button
                        variant="ghost"
                        disabled={props.locked}
                        loading={props.looking}
                        data-testid="clear-list-button"
                        onClick={() => props.onClear()}
                      >
                        {t('common.clear')}
                      </Button>
                    </Show>
                  }
                >
                  <Button
                    variant="ghost"
                    disabled={props.locked}
                    data-testid="discard-changes-button"
                    onClick={() => props.onClear()}
                  >
                    {t('button.discard-changes')}
                  </Button>
                </Show>
                {dispenseButton('dispense-button', undefined, true)}
              </div>
            </Show>
          </footer>
        </div>
      </section>
    </>
  );
};
