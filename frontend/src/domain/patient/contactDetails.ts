import type { ContactDetails } from '../../plugin-sdk/documents';

/*
 * The patient document's first contact block, `contactDetails[0]`: the one
 * the server projects onto the patient record (address, phone, email, …).
 * Later blocks stay in the document and never reach the record.
 */

export type ContactField = 'address1' | 'phone';

/**
 * Writes one field of the first contact block, keeping every other block and
 * every other field of the first as they were. A patient with no contact
 * details gets a first block on its first entry.
 */
export const withFirstContact = (
  blocks: readonly ContactDetails[] | undefined,
  field: ContactField,
  value: string | undefined
): ContactDetails[] => {
  const [first = {}, ...rest] = blocks ?? [];
  const next: ContactDetails = { ...first, [field]: value };
  if (value === undefined) delete next[field];
  return [next, ...rest];
};
