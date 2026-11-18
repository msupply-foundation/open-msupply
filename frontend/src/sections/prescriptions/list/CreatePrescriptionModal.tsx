import { generateUUID } from '../../../uuid';
import { type Component } from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import { t } from '../../../intl';
import { graphqlFetch } from '../../../api/graphql';
import { ChoosePatient } from '../../patients';
import { InsertPrescription } from './createPrescription.generated';

// Creating a dispensing record (#631 spike; spec/patients S2, after Ling's
// "Dispensary: choosing a patient" prototype): the patient search opens
// straight away, listing this store's recent patients, and choosing a patient
// creates the record for them and opens it. Date, reference, clinician and
// program are set on the record afterwards, in its header. New patient opens
// the shared create form over the search, saving as "Save & dispense". A
// failure shows in the search, which stays open.

export interface CreatePrescriptionModalProps {
  open: boolean;
  onClose: () => void;
}

export const CreatePrescriptionModal: Component<
  CreatePrescriptionModalProps
> = props => {
  const params = useParams<{ storeId: string }>();
  const navigate = useNavigate();

  const create = async (patientId: string) => {
    // Creation rejections are ALL non-typed (contract § creation), so opt in
    // to the raw GraphQL errors and show them in-dialog rather than tripping
    // the global modal for a user-correctable input.
    const result = await graphqlFetch(
      InsertPrescription,
      {
        storeId: params.storeId,
        input: { id: generateUUID(), patientId },
      },
      { returnGraphqlErrors: true }
    );
    if (result.kind === 'success') {
      const id = result.data.insertPrescription.id;
      props.onClose();
      navigate(`/${params.storeId}/dispensary/dispensing/${id}`);
      return undefined;
    }
    if (result.kind !== 'graphqlError') return t('error.something-wrong');
    // A patient just linked from another facility, on a site still syncing
    // over v5/v6: the link gives this store access straight away, but the
    // patient's record only arrives with the next sync.
    if (
      result.errors.some(e => e.extensions?.details === 'PatientDoesNotExist')
    )
      return t('messages.patient-arrives-next-sync');
    return result.message;
  };

  return (
    <ChoosePatient
      open={props.open}
      storeId={params.storeId}
      title={t('label.create-prescription')}
      saveLabel={t('button.save-and-dispense')}
      showRecent
      onClose={props.onClose}
      onChosen={patient => create(patient.id)}
    />
  );
};
