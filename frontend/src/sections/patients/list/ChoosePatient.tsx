import { createSignal, type JSX } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import {
  PatientSearchDialog,
  type NewPatientSeed,
} from '../../../domain/patient';
import { CreatePatientModal } from './CreatePatientModal';

// Choosing a patient, or creating one (#631 spike; spec/patients S2): the
// patient search, with New patient opening the create form over it. Every
// surface that picks or creates a patient goes through here, so none can skip
// the search. Cancelling the form returns to the search as typed.

export interface ChoosePatientProps {
  open: boolean;
  storeId: string;
  title: string;
  onClose: () => void;
  /**
   * A patient was chosen or created; they're in this store. Resolve with a
   * message to show it in the search, which stays open; the caller closes on
   * success. Omit to open the patient's detail screen.
   */
  onChosen?: (patient: {
    id: string;
    name: string;
  }) => Promise<string | undefined> | void;
  /** The create form's save button; Save by default. */
  saveLabel?: string;
  /** List this store's recent patients before anything is typed. */
  showRecent?: boolean;
  /** The patient being replaced (Change on a record). */
  changingFrom?: string;
}

export const ChoosePatient = (props: ChoosePatientProps): JSX.Element => {
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = createSignal(false);
  const [seed, setSeed] = createSignal<NewPatientSeed>();
  const [error, setError] = createSignal<string>();
  // Acting on a patient the create form made (Save & dispense): the search
  // shows again meanwhile, and mustn't start a second record.
  const [finishing, setFinishing] = createSignal(false);

  const chosen = async (patient: {
    id: string;
    name: string;
  }): Promise<string | undefined> => {
    setError(undefined);
    if (!props.onChosen) {
      props.onClose();
      navigate(`/${props.storeId}/dispensary/patients/${patient.id}`);
      return undefined;
    }
    return (await props.onChosen(patient)) ?? undefined;
  };

  return (
    <>
      <PatientSearchDialog
        open={props.open}
        storeId={props.storeId}
        title={props.title}
        showRecent={props.showRecent}
        changingFrom={props.changingFrom}
        error={error()}
        busy={finishing()}
        onClose={() => {
          setError(undefined);
          props.onClose();
        }}
        onChoose={chosen}
        onCreatePatient={searched => {
          setSeed(searched);
          setCreateOpen(true);
        }}
      />
      <CreatePatientModal
        open={createOpen()}
        storeId={props.storeId}
        seed={seed()}
        saveLabel={props.saveLabel}
        onClose={() => setCreateOpen(false)}
        // From Patients the form opens what it created or chose itself.
        onCreated={
          props.onChosen &&
          (async created => {
            setCreateOpen(false);
            setFinishing(true);
            try {
              const message = await chosen(created);
              if (message) setError(message);
            } finally {
              setFinishing(false);
            }
          })
        }
        onChooseExisting={
          props.onChosen &&
          (async patient => {
            const message = await chosen(patient);
            if (!message) setCreateOpen(false);
            return message;
          })
        }
      />
    </>
  );
};
