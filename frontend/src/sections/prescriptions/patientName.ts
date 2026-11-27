import { t } from '../../intl';

// The start of every store's unnamed patient id, `unnamed_patient_<storeId>`
// (spec/prescriptions rules › the unnamed patient, kdd/unnamed-patient). The
// same prefix as the server's repository::UNNAMED_PATIENT_ID_PREFIX: the id is
// the contract, so this is how the screens tell the record apart.
const UNNAMED_PATIENT_ID_PREFIX = 'unnamed_patient_';

/** Whether a patient id is a store's unnamed patient. */
export const isUnnamedPatientId = (id: string | null | undefined): boolean =>
  !!id && id.startsWith(UNNAMED_PATIENT_ID_PREFIX);

// The name a dispensing record's patient is shown by. Each store's unnamed
// patient is saved with the English name "Unnamed patient", for support and
// developers, so the screens, exports and labels show the translated label
// instead (spec/prescriptions rules › the unnamed patient).
export const shownPatientName = (
  name: string,
  id: string | null | undefined
): string => (isUnnamedPatientId(id) ? t('label.unnamed-patient') : name);
