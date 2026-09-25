import { formatFileSize, t } from '@/intl';
import type { FileRejection } from '@/ui/elements/inputs/uploadFiles';

/*
 * What this vertical accepts when a user attaches a file — to an asset on the
 * Documents tab, or to a status entry as its evidence. One place, because the
 * rules ARE one: rules.md § documents binds a status entry's files to the same
 * accepted types and the same caps as the record's own.
 */

// PDF/DOCX/XLSX/CSV/TXT/ODT/ODS/JPEG/PNG/WEBP, matched on extension (the
// shared client-side accept list — the server stores any type).
export const ACCEPT =
  '.pdf,.docx,.xlsx,.csv,.txt,.odt,.ods,.jpeg,.jpg,.png,.webp';
export const MAX_FILE_BYTES = 50 * 1024 * 1024; // 50MB per file
export const MAX_BATCH_BYTES = 100 * 1024 * 1024; // 100MB per request

/**
 * Per-file rejections as one message: each unacceptable file named with its
 * own reason, because "some of these are wrong" leaves the user guessing which.
 * Acceptable files in the same drop still upload — UploadZone hands those on
 * separately.
 */
export const describeRejections = (rejections: FileRejection<File>[]): string =>
  rejections
    .map(rejection =>
      rejection.reason === 'size'
        ? t('error.file-exceeds-size-limit', {
            filename: rejection.file.name,
            maxSize: formatFileSize(MAX_FILE_BYTES),
          })
        : t('error.file-type-not-supported', {
            filename: rejection.file.name,
          })
    )
    .join('\n');

/** A batch at or over the per-request cap is refused whole, before anything is sent. */
export const batchTooLarge = (files: File[]): boolean =>
  files.reduce((sum, file) => sum + file.size, 0) >= MAX_BATCH_BYTES;
