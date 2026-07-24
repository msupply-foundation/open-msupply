import { createSignal, Show, type Component } from 'solid-js';
import { t } from '../../../intl';
import { localisedDate } from '../../../intl/formatDateTime';
import { graphqlFetch } from '../../../api/graphql';
import { TextField } from '../../../ui/elements/inputs/TextField';
import { ConfirmDialog } from '../../../ui/elements/feedback/ConfirmDialog';
import { Popover } from '../../../ui/elements/feedback/Popover';
import { InfoIcon } from '../../../ui/icons';
import {
  OutboundLines,
  OutboundStocktakeConflict,
} from './outboundDetail.generated';
import { outboundPrefs } from '../outboundPreferencesResource';
import type { OutboundNode } from './outboundUpdate';
import {
  backdateBounds,
  backdateWarnings,
  backdatedDatetimeFor,
  backdatingGate,
  toDateInput,
  withinBackdateBounds,
  type BackdateWarningKey,
} from './backdating';

// The picked-date backdating control (spec/outbound-shipments rules.md §
// backdating; S3 side panel — AC-B1..B4). Enabled only while NEW with the
// backdating preference on; otherwise DISABLED WITH THE REASON (pref off /
// past NEW). Picking an earlier day confirms first — the line-removal warning
// (AC-B2) and, when a stocktake was counted on or after that day, the
// stocktake-conflict warning (AC-B4) — before setting backdatedDatetime; the
// parent's field save then re-issues against historical availability and
// stamps future statuses at the backdated time (server-side). The picker is
// bounded to [today − maxDays, today] so a future or over-limit day can't be
// chosen (the remaining AC-B1 rejections). The pure gate/date/warning logic
// lives in ./backdating (unit-tested); this component wires it to the UI + the
// stocktake-conflict query.

export interface PickedDateFieldProps {
  storeId: string;
  node: OutboundNode;
  /** Panel-wide read-only gate (SHIPPED onward). */
  disabled: boolean;
  /** Apply the backdate — sets backdatedDatetime (parent saves + refetches). */
  onBackdate: (backdatedDatetime: string) => void;
}

export const PickedDateField: Component<PickedDateFieldProps> = props => {
  // The chosen backdate awaiting confirmation (its ISO datetime + the warning
  // keys to show); undefined when no confirmation is open.
  const [pending, setPending] = createSignal<{
    backdatedDatetime: string;
    warningKeys: BackdateWarningKey[];
  }>();
  // The user's un-saved picked day, so a cancelled pick reverts the input
  // (the controlled `value` alone wouldn't — the node hasn't changed).
  const [draft, setDraft] = createSignal<string>();

  const backdating = () => outboundPrefs()?.prefs?.backdating;
  const gate = () =>
    backdatingGate({
      status: props.node.status,
      shipmentsEnabled: backdating()?.shipmentsEnabled ?? false,
      panelDisabled: props.disabled,
    });
  const enabled = () => gate().enabled;

  // The effective "as of" day: the backdated day if set, else picked, else the
  // creation day.
  const effectiveDay = () =>
    toDateInput(
      new Date(
        props.node.backdatedDatetime ??
          props.node.pickedDatetime ??
          props.node.createdDatetime
      )
    );
  const shown = () => draft() ?? effectiveDay();
  const bounds = () => backdateBounds(new Date(), backdating()?.maxDays ?? 0);

  const onPick = async (day: string) => {
    if (!day || day === effectiveDay()) {
      setDraft(undefined);
      return;
    }
    setDraft(day);
    const backdatedDatetime = backdatedDatetimeFor(new Date(), day);
    // Stocktake-conflict check (AC-B4): any stocktake counted on or after the
    // chosen day. A non-success is UNKNOWN, not "no conflict" — fail closed:
    // revert the pick and let the global unexpected-error modal (already
    // raised by graphqlFetch) explain, rather than backdating unconfirmed.
    const result = await graphqlFetch(OutboundStocktakeConflict, {
      storeId: props.storeId,
      onOrAfter: day,
    });
    if (result.kind !== 'success') {
      setDraft(undefined);
      return;
    }
    const stocktakeConflict = result.data.stocktakes.totalCount > 0;
    // "Existing lines will be removed" needs the WHOLE shipment's line count —
    // the entity query no longer carries lines and the view's page is
    // filtered, so probe the server (count only), failing closed as above.
    const linesResult = await graphqlFetch(OutboundLines, {
      storeId: props.storeId,
      filter: { invoiceId: { equalTo: props.node.id } },
      page: { first: 1 },
    });
    if (linesResult.kind !== 'success') {
      setDraft(undefined);
      return;
    }
    const warningKeys = backdateWarnings({
      hasLines: linesResult.data.invoiceLines.totalCount > 0,
      stocktakeConflict,
    });
    // Nothing to warn about → apply directly; otherwise confirm first.
    if (warningKeys.length === 0) {
      props.onBackdate(backdatedDatetime);
      setDraft(undefined);
      return;
    }
    setPending({ backdatedDatetime, warningKeys });
  };

  // The confirmation body: the applicable warnings (AC-B2/B4), each resolved
  // with the chosen date (spec S6 § confirmation dialog). Each warning sits on
  // its own block (both ported sentences end in "Are you sure…?", so joined
  // into one line they read as a run-on); <br/> not <p> — the Dialog already
  // renders the description inside a <p>.
  const confirmMessage = () => {
    const info = pending();
    if (!info) return '';
    const date = localisedDate(info.backdatedDatetime);
    return info.warningKeys.map((key, index) => (
      <>
        <Show when={index > 0}>
          <br />
          <br />
        </Show>
        {t(key, { date })}
      </>
    ));
  };

  return (
    <>
      <span
        style={{
          display: 'inline-flex',
          'align-items': 'center',
          gap: 'var(--space-2)',
        }}
      >
        <TextField
          label={t('label.picked-date')}
          hideLabel
          type="date"
          // Explicit width (spread onto the <input>): the input's default
          // `width: 100%` fills the panel row's whole control column, pushing
          // the disabled-reason info bubble past the panel edge where its own
          // scroll clips it. A dd/mm/yyyy date fits in 8rem, leaving room for
          // the bubble beside it. The width-cap variants can't do this — they
          // only cap, and the column is narrower than every cap.
          style={{ width: '8rem' }}
          data-testid="picked-date-field"
          value={shown()}
          min={enabled() ? bounds().min : undefined}
          max={enabled() ? bounds().max : undefined}
          disabled={!enabled()}
          onChange={e => {
            // AC-B1 rejection on the save path: min/max only constrain the
            // picker UI — a TYPED out-of-range day still fires change with
            // the value — so re-check the window here and snap the input
            // back to the last effective day instead of picking.
            if (!withinBackdateBounds(bounds(), e.currentTarget.value)) {
              e.currentTarget.value = shown();
              return;
            }
            void onPick(e.currentTarget.value);
          }}
        />
        {/* When a backdating gate disables the field (pref off / past NEW), an
            info popover explains why on hover / focus / tap — disable-with-
            reason (spec S3), reusing the ported reason messages. */}
        <Show when={gate().reasonKey}>
          {key => (
            <Popover
              trigger={<InfoIcon />}
              triggerLabel={t(key())}
              triggerTestId="picked-date-reason"
              openOnHover
              placement="top"
            >
              <p>{t(key())}</p>
            </Popover>
          )}
        </Show>
      </span>
      <ConfirmDialog
        open={pending() != null}
        title={t('heading.are-you-sure')}
        message={confirmMessage()}
        onClose={() => {
          setPending(undefined);
          setDraft(undefined);
        }}
        onConfirm={() => {
          const info = pending();
          setPending(undefined);
          setDraft(undefined);
          if (info) props.onBackdate(info.backdatedDatetime);
        }}
      />
    </>
  );
};
