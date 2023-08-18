import {
  ContactTraceNodeStatus,
  LocaleKey,
  TypedTFunction,
  noOtherVariants,
} from '@openmsupply-client/common';

export const traceStatusTranslation = (
  status: ContactTraceNodeStatus,
  t: TypedTFunction<LocaleKey>
): string => {
  switch (status) {
    case ContactTraceNodeStatus.Pending:
      return t('label.trace-status-pending');
    case ContactTraceNodeStatus.Done:
      return t('label.trace-status-done');
    default:
      return noOtherVariants(status);
  }
};
