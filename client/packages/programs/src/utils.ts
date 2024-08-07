import { RnRFormNodeStatus } from '@common/types';
import { ProgramEventFragment } from './api';
import { RnRFormFragment } from './api/operations.generated';
import { LocaleKey, useTranslation } from '@common/intl';

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

const statusTranslation: Record<RnRFormNodeStatus, LocaleKey> = {
  DRAFT: 'label.draft',
  FINALISED: 'label.finalised',
};

export const getStatusTranslator =
  (t: ReturnType<typeof useTranslation>) =>
  (currentStatus: RnRFormNodeStatus): string => {
    return t(
      statusTranslation[currentStatus] ??
        statusTranslation[RnRFormNodeStatus.Draft]
    );
  };
