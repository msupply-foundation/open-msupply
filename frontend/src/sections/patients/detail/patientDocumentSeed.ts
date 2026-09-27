import type { ContactDetails, Patient } from '../../../plugin-sdk/documents';
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
