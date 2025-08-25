import {
  LocaleKey,
  SyncMessageNodeStatus,
  SyncMessageNodeType,
} from '@openmsupply-client/common';

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

export const typeMapping = (type?: SyncMessageNodeType): LocaleKey => {
  switch (type) {
    case SyncMessageNodeType.RequestFieldChange:
      return 'label.request-field-change';
    case SyncMessageNodeType.Other:
      return 'label.other';
    default:
      console.warn(`Unknown sync message type: ${type}`);
      return 'messages.not-applicable';
  }
};
