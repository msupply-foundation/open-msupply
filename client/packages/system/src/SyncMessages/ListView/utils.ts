import { LocaleKey, SyncMessageNodeStatus } from '@openmsupply-client/common';

export const statusMapping = (status?: SyncMessageNodeStatus): LocaleKey => {
  switch (status) {
    case SyncMessageNodeStatus.New:
      return 'label.new';
    case SyncMessageNodeStatus.Processed:
      return 'label.processed';
    default:
      console.warn(`Unknown sync message status: ${status}`);
      return 'messages.not-applicable';
  }
};
