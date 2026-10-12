import type { ContactDetails, Patient } from '../../../plugin-sdk/documents';
import type { Gender } from '../../../domain/patient';
import type { PatientResult } from './patient.generated';

type PatientNode = NonNullable<PatientResult['patient']>;

// The name row's own fields, back into the document shape: exactly what the
// server projects from a document onto the row, so a first save round-trips
// the patient as it stands.
export const seedPatientDocument = (node: PatientNode): Patient => {
  const contact: ContactDetails = {
    address1: node.address1 ?? undefined,
    address2: node.address2 ?? undefined,
    country: node.country ?? undefined,
    phone: node.phone ?? undefined,
    email: node.email ?? undefined,
    website: node.website ?? undefined,
  };
  const hasContact = Object.values(contact).some(v => v !== undefined);
  const nextOfKin =
    node.nextOfKinId || node.nextOfKinName
      ? {
          id: node.nextOfKinId ?? undefined,
          name: node.nextOfKinName ?? undefined,
        }
      : undefined;
  const seed: Patient = {
    id: node.id,
    code: node.code || undefined,
    code2: node.code2 ?? undefined,
    firstName: node.firstName ?? '',
    lastName: node.lastName ?? '',
    gender: node.gender ?? undefined,
    dateOfBirth: node.dateOfBirth ?? undefined,
    isDeceased: node.isDeceased || undefined,
    dateOfDeath: node.dateOfDeath ?? undefined,
    contactDetails: hasContact ? [contact] : undefined,
    nextOfKin,
  };
  // A plain object with no undefined properties, as a saved document is.
  return JSON.parse(JSON.stringify(seed)) as Patient;
};

/** What the create wizard's first step asks, as it carries it forward. */
export interface NewPatientFields {
  firstName: string;
  lastName: string;
  dateOfBirth: string | null;
  gender: Gender | null;
  address: string;
  phone: string;
}

// A new patient's first document from the create wizard's first step: the
// fields it asked, at the paths the server projects onto the patient record,
// the address and phone in the first contact block. Where a plugin's patient
// form edits it, it also starts with an empty `extension`, as the old client's
// create starts every new patient, so a field the deployment's schema
// requires inside `extension` (a nationality, say) is required from the
// start; the host's default form, which draws none of a deployment's own
// fields, leaves it out, or a required one would refuse the create with no
// field to fill in.
export const seedNewPatientDocument = (
  id: string,
  fields: NewPatientFields,
  pluginForm: boolean
): Patient => {
  const address1 = fields.address.trim() || undefined;
  const phone = fields.phone.trim() || undefined;
  const seed: Patient = {
    id,
    firstName: fields.firstName,
    lastName: fields.lastName,
    gender: fields.gender ?? undefined,
    dateOfBirth: fields.dateOfBirth ?? undefined,
    contactDetails: address1 || phone ? [{ address1, phone }] : undefined,
    extension: pluginForm ? {} : undefined,
  };
  return JSON.parse(JSON.stringify(seed)) as Patient;
};
