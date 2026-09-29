// The sync-file domain module (kdd/domain-modules): the REST store behind a
// record's document attachments, the shared client-side accept list and size
// caps, and the Documents tab every record screen composes over them.
export {
  uploadSyncFiles,
  deleteSyncFile,
  syncFileUrl,
  type SyncFileResult,
} from './syncFiles';
export {
  ACCEPT,
  MAX_FILE_BYTES,
  MAX_BATCH_BYTES,
  batchTooLarge,
  describeRejections,
} from './documentUploads';
export {
  RecordDocumentsTab,
  type RecordDocument,
  type RecordDocumentsTabProps,
} from './RecordDocumentsTab';
