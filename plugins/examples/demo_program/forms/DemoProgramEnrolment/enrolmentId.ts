/*
 * The demo program's enrolment ID: the issuing store's code and a counter the
 * server keeps per store, `GRY-0042` (kdd/custom-forms/specs.md § Generated
 * identifiers). The generator is these few lines of code, where the old UI's
 * IdGenerator control took a configuration of parts and string mutations.
 */

/**
 * The server counter the IDs are drawn from. Named once and never renamed:
 * a new name would start a new counter and reissue numbers already given out.
 */
export const ENROLMENT_ID_COUNTER = 'DemoProgramEnrolment';

/** The ID for a counter value drawn at a store. */
export const formatEnrolmentId = (storeCode: string, counter: number): string =>
  `${storeCode}-${String(counter).padStart(4, '0')}`;
