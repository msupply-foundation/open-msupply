import { RnRFormNodeStatus } from '@common/types';
import { RnRFormFragment } from './api/operations.generated';
import { LocaleKey, useTranslation } from '@common/intl';

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
