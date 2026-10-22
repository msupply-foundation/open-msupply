import type { Encounter } from '../../plugin-sdk/documents';

/**
 * What Save as visited writes (internal #1656): the status, and the end time
 * where none is recorded.
 */
export const visitedFields = (
  endDatetime: string | undefined,
  now: Date
): Pick<Encounter, 'status' | 'endDatetime'> => ({
  status: 'VISITED',
  endDatetime: endDatetime || now.toISOString(),
});
