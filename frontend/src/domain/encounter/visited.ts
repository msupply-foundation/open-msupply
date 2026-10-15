import type { Encounter } from '../../plugin-sdk/documents';

/*
 * Save on an encounter still Pending whose visit date has passed asks first
 * whether to record it as visited, as the old client does: saving after the
 * visit is usually recording it. Pending as saved and as edited, since a
 * status the user has just chosen is their answer already.
 */
export const suggestsVisited = (
  saved: Partial<Encounter> | undefined,
  editedStatus: Encounter['status'],
  now: Date
): boolean =>
  saved?.status === 'PENDING' &&
  editedStatus === 'PENDING' &&
  !!saved.startDatetime &&
  new Date(saved.startDatetime).getTime() < now.getTime();

/**
 * What Save as visited writes: the status, and the end time where none is
 * recorded.
 */
export const visitedFields = (
  endDatetime: string | undefined,
  now: Date
): Pick<Encounter, 'status' | 'endDatetime'> => ({
  status: 'VISITED',
  endDatetime: endDatetime || now.toISOString(),
});
