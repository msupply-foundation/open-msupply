import { RnRFormNodeStatus } from '@common/types';
import { ProgramEventFragment } from './api';
import { RnRFormFragment } from './api/operations.generated';

/**
 * Finds all events that are status events and return their data
 */
export const getStatusEventData = (events: ProgramEventFragment[]): string[] =>
  events
    .filter(e => e.type?.startsWith('status'))
    .map(e => e.data)
    .filter((data): data is string => !!data);

export const isRnRFormDisabled = (form: RnRFormFragment): boolean => {
  return form.status === RnRFormNodeStatus.Finalised;
};
