/*
 * The hand-off from the Simple screen's Standard view to the list's create
 * dialog (spec/prescriptions rules › the Simple screen, ui-surface S2): the
 * list opens the dialog, for the patient named if any, once. Two search
 * params, so the list can tell "open it, nobody chosen" from "don't open it".
 */

export const NEW_RECORD_PARAM = 'new-record';
export const NEW_RECORD_PATIENT_PARAM = 'patient';

/** The search params the list reads the hand-off from. */
export type NewRecordParams = {
  [NEW_RECORD_PARAM]?: string;
  [NEW_RECORD_PATIENT_PARAM]?: string;
};

/** The list's address, asking it to open the create dialog for a patient. */
export const newRecordHref = (listHref: string, patientId?: string): string => {
  const search = new URLSearchParams({ [NEW_RECORD_PARAM]: '1' });
  if (patientId) search.set(NEW_RECORD_PATIENT_PARAM, patientId);
  return `${listHref}?${search.toString()}`;
};

/**
 * What the hand-off asks for: undefined when it asks nothing, else the patient
 * to fill in (none when nobody was chosen).
 */
export const newRecordRequest = (
  params: NewRecordParams
): { patientId?: string } | undefined => {
  if (params[NEW_RECORD_PARAM] !== '1') return undefined;
  const patientId = params[NEW_RECORD_PATIENT_PARAM];
  return patientId ? { patientId } : {};
};
