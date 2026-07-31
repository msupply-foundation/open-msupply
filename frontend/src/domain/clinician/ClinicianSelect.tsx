import { createSignal, Show, type JSX } from 'solid-js';
import { t } from '../../intl';
import { Combobox } from '../../ui/elements/selectors/Combobox';
import { Button } from '../../ui/elements/buttons/Button';
import { PlusCircleIcon } from '../../ui/icons';
import { hasPermission } from '../../store/storeContext';
import { CreateClinicianModal } from './CreateClinicianModal';
import {
  cliniciansResource,
  clinicianName,
  type Clinician,
} from './clinicianResource';

export interface ClinicianSelectProps {
  /** The selected clinician's id (undefined = none). */
  value?: string;
  /** Fires with the chosen clinician, or null when cleared. */
  onChange: (clinician: Clinician | null) => void;
  /** Field label (required for a11y). */
  label: string;
  hideLabel?: boolean;
  /** Control size — `small` for a header field cluster's compact row. */
  size?: 'default' | 'small';
  /** Width cap — `full` to fill the slot a layout hands it (header clusters). */
  width?: 'compact' | 'short' | 'long' | 'full';
  disabled?: boolean;
  error?: string;
  placeholder?: string;
  /** `data-testid` for the input — forwarded to the Combobox. */
  inputTestId?: string;
  /**
   * Offer the **create-clinician** side flow at the foot of the option list
   * (spec/prescriptions ui-surface S8) — for the prescribing surfaces, which
   * own clinician creation. Still withheld from a session without the
   * clinician mutate permission, or while the picker is disabled.
   */
  allowCreate?: boolean;
  /**
   * The store a created clinician is assigned to. Required by `allowCreate`.
   */
  storeId?: string;
}

/*
 * The reusable clinician picker — a Combobox pre-wired to the store-scoped
 * clinician resource (active clinicians, displayed "Last, First"). A domain
 * widget (src/domain), consumed by the prescriptions create modal and detail
 * toolbar; clearable because a prescription's clinician is optional
 * (spec/prescriptions AC-N2).
 *
 * With `allowCreate` it also owns the create side flow: the affordance, the
 * modal, and reporting the new clinician back through `onChange` as though it
 * had been picked. Owning it here means both prescription surfaces get the flow
 * from one wiring, and the "select what was just created" step exists once.
 */
export const ClinicianSelect = (props: ClinicianSelectProps): JSX.Element => {
  const [createOpen, setCreateOpen] = createSignal(false);

  // Hidden rather than disabled for a session that cannot insert: a form whose
  // Save can only fail is a blocked affordance (D89, ui-standards › controls).
  // A missing storeId withholds it too, so the affordance is never offered
  // without somewhere to create into.
  const canCreate = () =>
    props.allowCreate === true &&
    props.disabled !== true &&
    props.storeId !== undefined &&
    hasPermission('MUTATE_CLINICIAN');

  return (
    <>
      <Combobox<Clinician>
        label={props.label}
        hideLabel={props.hideLabel}
        size={props.size}
        width={props.width}
        items={cliniciansResource.noSuspense()}
        loading={cliniciansResource.loading()}
        itemToString={clinicianName}
        itemToValue={clinician => clinician.id}
        value={props.value}
        disabled={props.disabled}
        error={props.error}
        placeholder={props.placeholder}
        inputTestId={props.inputTestId}
        onChange={clinician => props.onChange(clinician)}
        // Last in the open list, present whether or not anything is typed — so
        // it is also what the no-match state offers (`.64`).
        listboxFooter={
          <Show when={canCreate()}>
            <Button
              variant="secondary"
              icon={<PlusCircleIcon />}
              data-testid="create-clinician-button"
              onClick={() => setCreateOpen(true)}
            >
              {t('label.create-clinician')}
            </Button>
          </Show>
        }
      />
      <Show when={canCreate() && props.storeId}>
        {storeId => (
          <CreateClinicianModal
            open={createOpen()}
            storeId={storeId()}
            onClose={() => setCreateOpen(false)}
            // Selected exactly as a picked option would be, so the consumer's
            // own onChange handler attaches it (`.68`).
            onCreated={clinician => props.onChange(clinician)}
          />
        )}
      </Show>
    </>
  );
};
