import {
  createEffect,
  createMemo,
  createResource,
  createSignal,
  Show,
  type Component,
} from 'solid-js';
import {
  formatNumber,
  getCurrencyInfo,
  homeCurrency,
  locale,
  t,
} from '../../../intl';
import { graphqlFetch } from '../../../api/graphql';
import { Dialog } from '../../../ui/elements/feedback/Dialog';
import { Alert } from '../../../ui/elements/feedback/Alert';
import { Button } from '../../../ui/elements/buttons/Button';
import { localTodayIso } from '../../../ui/elements/inputs/dateTimeConvert';
import { CurrencyField } from '../../../ui/elements/inputs/CurrencyField';
import { TextField } from '../../../ui/elements/inputs/TextField';
import { FormColumns } from '../../../ui/layout/Form/FormColumns';
import { FormColumn } from '../../../ui/layout/Form/FormColumn';
import { Combobox } from '../../../ui/elements/selectors/Combobox';
import { createSaveCoordinator } from '../../../plugins/formParticipation';
import { PrescriptionPaymentSlot } from '../../../plugins/PrescriptionPaymentSlot';
import type { SaveContext } from '../../../plugin-sdk/types';
import { paymentSplit } from './paymentSplit';
import {
  InsurancePolicies,
  type InsurancePoliciesResult,
} from './insurance.generated';
import type { UpdateInput } from './prescriptionUpdate';
import type { PrescriptionFieldsFragment } from './prescriptionDetail.generated';

// The payment window (spec/prescriptions/ui-surface.md S5; AC-Y1/Y2): opened
// by the status confirmation when insurance providers exist and the total is
// charged. Total to be paid (read-only) · Insurance policy (the patient's
// ACTIVE, unexpired policies — patients-owned records) · Discount rate ·
// Paid by insurance (derived). Confirming hands the policy + discount fields
// to the status change so they save together; cancelling leaves the status
// untouched.
//
// The form is also a PLUGIN SLOT — S5's "(A plugin slot may extend this
// form.)", the `prescription.payment-form` slot (spec/plugins/ui-surface.md
// S1). A contribution renders below the host fields and participates in this
// window's save: it may VETO before anything is persisted, and act AFTER the
// status change lands. With no plugin targeting the slot the region renders
// nothing and reserves no space, so this window looks and behaves exactly as
// before.

type Policy = NonNullable<
  InsurancePoliciesResult['insurancePolicies']['nodes']
>[number];

export interface PaymentsModalProps {
  storeId: string;
  node: PrescriptionFieldsFragment;
  working: boolean;
  /**
   * The server's typed rejection of the status change, when this window was the
   * surface that initiated it (S7: in-dialog, never a toast). Shown alongside a
   * plugin's own notice, in the same place — the window stays open so a plugin
   * contribution's draft survives an error the user can fix.
   */
  rejection?: string;
  onClose: () => void;
  /**
   * Confirm: the payment fields ride the status update (one operation).
   *
   * `afterSave` runs once that update has SUCCEEDED and must be awaited before
   * the save counts as complete (spec/plugins/rules.md § form participation).
   * It resolves to a message when a plugin's post-save work failed, and
   * `undefined` when everything landed — so a veto or a rejected status change
   * leaves no plugin data behind (AC-PLUG-F2), and a plugin write that fails
   * after a successful host write is reported rather than lost.
   */
  onConfirm: (
    extra: Partial<UpdateInput>,
    afterSave: (context: SaveContext) => Promise<string | undefined>
  ) => void;
}

export const PaymentsModal: Component<PaymentsModalProps> = props => {
  const [policyId, setPolicyId] = createSignal<string>();
  /*
   * Two DIFFERENT plugin messages, deliberately not one signal — they have
   * opposite lifetimes:
   *
   * · `blocked` is why this save attempt was refused (an invalid field, or a
   *   veto). It clears the moment the contribution reports itself valid again.
   * · `saveFailure` is a contribution's post-save work that failed AFTER the
   *   host record was written. It must NOT clear on validity — the form is
   *   perfectly valid, and that is exactly the state in which the plugin's own
   *   write went missing. Sharing one signal made the clearing effect erase it
   *   instantly, which is the opposite of the "must not vanish silently" rule
   *   (spec/prescriptions/ui-surface.md S5).
   */
  const [blocked, setBlocked] = createSignal<string>();
  const [saveFailure, setSaveFailure] = createSignal<string>();
  // Covers the before-save await only; props.working covers the mutation.
  const [vetting, setVetting] = createSignal(false);

  // One coordinator per open window; each contribution gets its own view of it
  // inside the slot, so each releases its own handlers when it leaves.
  const coordinator = createSaveCoordinator();

  /*
   * The patient's policies, fetched when the window opens (it mounts per open);
   * only active, unexpired ones are offered (AC-Y2).
   *
   * Keyed on the patient id — a PRIMITIVE, so the resource's internal source
   * memo can dedupe it (its default equality is `===`, and an object literal is
   * a new value every evaluation). `props.storeId` is read inside the fetcher
   * instead: it cannot change while one window is open, and including it in the
   * key bought nothing.
   *
   * It matters because the source tracks `props.node`, and a plugin's post-save
   * failure now leaves this window OPEN while the saved node merges in. With an
   * object key that merge re-issued this query with identical variables; if the
   * retry then failed — likely, since the same outage just killed the plugin
   * write — `policies()` collapsed to empty, the selected policy vanished, the
   * split re-derived with the patient owing the full total, and the plugin's
   * validity flipped to invalid: OK would then be silently gated while the
   * notice still said the plugin write failed. The same query is keyed on a
   * primitive in PrescriptionDetailView for the same reason.
   */
  const [policiesData] = createResource(
    () => props.node.patient?.id ?? '',
    async nameId => {
      if (!nameId) return [];
      const result = await graphqlFetch(InsurancePolicies, {
        storeId: props.storeId,
        nameId,
      });
      return result.kind === 'success'
        ? result.data.insurancePolicies.nodes
        : undefined;
    }
  );
  const today = localTodayIso();
  // State-gated (never suspends) — the window first-fetches while open.
  const policies = (): Policy[] =>
    (
      (policiesData.state === 'ready' || policiesData.state === 'refreshing'
        ? policiesData.latest
        : undefined) ?? []
    ).filter(policy => policy.isActive && policy.expiryDate >= today);

  const selected = () => policies().find(policy => policy.id === policyId());
  const total = () => props.node.pricing.totalAfterTax;
  const covered = createMemo(() => {
    const policy = selected();
    return policy ? (total() * policy.discountPercentage) / 100 : 0;
  });
  // The rounded split, for the plugin slot's DTO (see paymentSplit): the wire
  // still carries the unrounded `covered()`, exactly as before.
  const split = createMemo(() =>
    paymentSplit(
      total(),
      selected()?.discountPercentage,
      getCurrencyInfo(homeCurrency(), locale()).decimals
    )
  );

  /*
   * A refusal clears as soon as every contribution reports itself valid again,
   * so a "you still owe" notice cannot sit over a form the user has plainly
   * balanced. Validity is the contribution's continuous signal; the message is
   * only ever SHOWN after a save was attempted, so this only ever clears — it
   * never surfaces anything on its own.
   */
  createEffect(() => {
    if (!coordinator.invalidMessage()) setBlocked(undefined);
  });

  const confirm = async () => {
    setBlocked(undefined);
    setSaveFailure(undefined);

    /*
     * Validity gates the save (spec/plugins/rules.md § form participation:
     * "gate validity — blocking save with a per-field message"; AC-PLUG-F1).
     * Checked BEFORE the veto handlers, so a contribution that reports invalid
     * blocks the save whether or not it also registered a veto — which is what
     * makes `setValidity` a real gate rather than a signal the host ignores.
     */
    const invalid = coordinator.invalidMessage();
    if (invalid !== undefined) return setBlocked(invalid);

    setVetting(true);
    const veto = await coordinator.runBeforeSave();
    setVetting(false);
    if (veto.kind === 'vetoed') return setBlocked(veto.message);

    const policy = selected();
    props.onConfirm(
      policy
        ? {
            nameInsuranceJoinId: { value: policy.id },
            insuranceDiscountPercentage: policy.discountPercentage,
            insuranceDiscountAmount: covered(),
          }
        : {},
      async context => {
        const outcome = await coordinator.runAfterSave(context);
        if (outcome.kind !== 'failed') return undefined;
        setSaveFailure(outcome.message);
        return outcome.message;
      }
    );
  };

  const busy = () => props.working || vetting();

  return (
    <Dialog
      open
      // The single-column measure: four short fields read down one column,
      // and it holds a plugin contribution's own columns to one stack too
      // (they fall below FormColumn's min width here), so the whole window
      // is one list of fields rather than a grid.
      width="prose"
      dismissable={!busy()}
      onClose={props.onClose}
      title={t('title.payment')}
      testId="payments-modal"
      footer={
        /*
         * THIS attempt's outcome outranks the last one's. `saveFailure` and
         * `blocked` are both cleared at the top of every `confirm`, so either
         * one showing belongs to the current attempt; `props.rejection` may be
         * left over from a previous one, and would otherwise mask a fresh veto.
         */
        <Show when={saveFailure() ?? blocked() ?? props.rejection}>
          {message => (
            <Alert severity="error" testId="payment-plugin-error">
              {message()}
            </Alert>
          )}
        </Show>
      }
      actions={
        <>
          {/* Hidden — not merely disabled — while a save is in flight, matching
              the status confirmation's own Cancel (D39's reasoning: a control
              that cannot act should not be offered). Cancel here unmounts the
              window, which disposes any plugin contribution inside it and
              RELEASES its after-save handler — so a click landing between the
              host's mutation and the plugin's own write would silently drop
              that write. Gating it also hands its cancel role back for the
              duration (createConfirmClaim releases on unmount). */}
          <Show when={!busy()}>
            <Button
              variant="secondary"
              confirms="cancel"
              onClick={props.onClose}
            >
              {t('button.cancel')}
            </Button>
          </Show>
          <Button
            confirms="plain"
            data-testid="dialog-button-ok"
            loading={busy()}
            onClick={() => void confirm()}
          >
            {t('button.ok')}
          </Button>
        </>
      }
    >
      {/* One column of stacked fields, in the order S5 lists them, each
          control carrying its own label ABOVE it (ui-standards § inputs: a
          field standing alone uses the control's built-in label, no
          FieldRow). The FormColumns wrapper stays so the plugin slot below
          and these fields share one layout vocabulary. */}
      <FormColumns>
        <FormColumn>
          <CurrencyField
            label={t('label.total-to-be-paid')}
            value={total()}
            readonly
            onChange={() => undefined}
          />
          <Combobox<Policy>
            label={t('label.insurance-policy')}
            items={policies()}
            loading={policiesData.loading}
            /* Number AND provider — a policy number alone doesn't say who
             * the insurer is, and a patient can hold policies with several
             * (#1042; the field's own label reads "Policy / Insurance name").
             * The provider is nullable on the wire, so a policy without one
             * still reads as its bare number. Combobox filters on this string
             * too, so provider name is searchable.
             */
            itemToString={policy =>
              policy.insuranceProviders
                ? `${policy.policyNumber} - ${policy.insuranceProviders.providerName}`
                : policy.policyNumber
            }
            itemToValue={policy => policy.id}
            value={policyId()}
            clearable
            /* Composed labels outrun a dialog-width popup — let it size to
             * its content (as the patient and location pickers do).
             */
            matchTriggerWidth={false}
            onChange={policy => setPolicyId(policy?.id)}
          />
          {/* A read-only FIELD, not bare text: with the label above, a lone
              value would float unaligned beside its boxed siblings. The dash
              stays for "no policy chosen" — an empty box would read as a
              field waiting for input. */}
          <TextField
            label={t('label.discount-rate')}
            readonly
            value={(policy =>
              policy ? `${formatNumber(policy.discountPercentage)}%` : '—')(
              selected()
            )}
          />
          <CurrencyField
            label={t('label.paid-by-insurance')}
            value={covered()}
            readonly
            onChange={() => undefined}
          />
        </FormColumn>
      </FormColumns>

      {/* The plugin slot region — nothing, and no space, when unfilled. The
          prescription DTO is a getter-bearing object so the numbers stay
          reactive without the props object's identity moving (which would
          remount a contribution mid-edit). */}
      <PrescriptionPaymentSlot
        coordinator={coordinator}
        prescription={{
          get id() {
            return props.node.id;
          },
          get invoiceNumber() {
            return props.node.invoiceNumber;
          },
          get total() {
            return split().total;
          },
          get totalToBePaidByInsurance() {
            return split().paidByInsurance;
          },
          get totalToBePaidByPatient() {
            return split().paidByPatient;
          },
        }}
      />
    </Dialog>
  );
};
