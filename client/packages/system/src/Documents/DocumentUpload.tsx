import React from 'react';
import {
  Accept,
  FileRejection,
  Typography,
  UploadFile,
  useNotification,
  useTranslation,
} from '@openmsupply-client/common';
import { Environment } from '@openmsupply-client/config';

/**
 * File types accepted for record documents (see issue #12229):
 * documents (PDF, DOCX, XLSX, CSV, TXT, ODT, ODS) and images of physical
 * documents (JPEG, PNG, WEBP).
 */
export const DOCUMENT_ACCEPT: Accept = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [
    '.docx',
  ],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [
    '.xlsx',
  ],
  'text/csv': ['.csv'],
  'text/plain': ['.txt'],
  'application/vnd.oasis.opendocument.text': ['.odt'],
  'application/vnd.oasis.opendocument.spreadsheet': ['.ods'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
};

/** Per-file size limit, matching MAX_SYNC_FILE_SIZE_BYTES on the server. */
export const MAX_DOCUMENT_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

/** Whole-request cap enforced by the server's content-length middleware. */
export const MAX_UPLOAD_REQUEST_BYTES = 100 * 1024 * 1024; // 100MB

const MAX_SIZE_LABEL = `${MAX_DOCUMENT_SIZE_BYTES / (1024 * 1024)}MB`;
const MAX_REQUEST_LABEL = `${MAX_UPLOAD_REQUEST_BYTES / (1024 * 1024)}MB`;

const ALLOWED_EXTENSIONS = Object.values(DOCUMENT_ACCEPT).flat();
const ALLOWED_MIME_TYPES = new Set(Object.keys(DOCUMENT_ACCEPT));

// Accept on extension OR MIME type, mirroring the drag & drop zone's matching
// (attr-accept) — e.g. photo.jfif reports image/jpeg but has no listed
// extension, and some platforms report CSVs with an Excel MIME type.
const isAllowedDocumentType = ({ name, type }: Pick<File, 'name' | 'type'>) =>
  ALLOWED_MIME_TYPES.has(type) ||
  ALLOWED_EXTENSIONS.some(extension => name.toLowerCase().endsWith(extension));

interface DocumentUploadProps {
  recordId: string;
  tableName: string;
  invalidateQueries?: () => void;
  /** Optional bold heading rendered above the upload zone. */
  heading?: string;
  color?: 'primary' | 'secondary' | 'gray';
}

/**
 * Drag-and-drop upload zone for record documents: accepts only
 * DOCUMENT_ACCEPT file types up to MAX_DOCUMENT_SIZE_BYTES each, posts them to
 * the sync_files endpoint for the given record, then invalidates the relevant
 * queries.
 */
export const DocumentUpload = ({
  recordId,
  tableName,
  invalidateQueries = () => {},
  heading,
  color = 'secondary',
}: DocumentUploadProps) => {
  const t = useTranslation();
  const { error, success } = useNotification();

  const rejectFile = (filename: string, reason: 'type' | 'size') =>
    error(
      reason === 'size'
        ? t('error.file-exceeds-size-limit', {
            filename,
            maxSize: MAX_SIZE_LABEL,
          })
        : t('error.file-type-not-supported', { filename })
    )();

  // The drag & drop zone validates via `accept`/`maxSize`; this covers the
  // native file picker path and reports each invalid file.
  const validateFiles = (files: File[]) => {
    const valid: File[] = [];
    files.forEach(file => {
      if (!isAllowedDocumentType(file)) rejectFile(file.name, 'type');
      else if (file.size > MAX_DOCUMENT_SIZE_BYTES)
        rejectFile(file.name, 'size');
      else valid.push(file);
    });
    return valid;
  };

  const onRejected = (rejections: FileRejection[]) =>
    rejections.forEach(({ file, errors }) =>
      rejectFile(
        file.name,
        errors.some(({ code }) => code === 'file-too-large') ? 'size' : 'type'
      )
    );

  const onUpload = async (files: File[]) => {
    if (!recordId) return;

    const validFiles = validateFiles(files);
    if (validFiles.length === 0) return;

    // All files go in one request, which the server caps at 100MB total —
    // catch that here so the user gets an accurate message without a roundtrip.
    const requestBytes = validFiles.reduce((sum, file) => sum + file.size, 0);
    if (requestBytes >= MAX_UPLOAD_REQUEST_BYTES) {
      error(t('error.upload-too-large', { maxSize: MAX_REQUEST_LABEL }))();
      return;
    }

    const url = `${Environment.SYNC_FILES_URL}/${tableName}/${recordId}`;
    const formData = new FormData();
    validFiles.forEach(file => {
      formData.append('files', file);
    });

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
        },
        credentials: 'include',
        body: formData,
      });
      if (response.ok) {
        success(t('success'))();
        invalidateQueries();
        return;
      }
      // Prefer the response body (e.g. the server's per-file size message);
      // a body-less 413 comes from the content-length middleware's
      // whole-request limit (e.g. multipart overhead pushing it over).
      const body = (await response.text().catch(() => '')).trim();
      const message =
        body ||
        (response.status === 413
          ? t('error.upload-too-large', { maxSize: MAX_REQUEST_LABEL })
          : response.statusText);
      error(t('error.an-error-occurred', { message }))();
    } catch (e) {
      console.error(e);
      error(t('error.an-error-occurred', { message: (e as Error).message }))();
    }
  };

  return (
    <>
      {heading && (
        <Typography sx={{ fontWeight: 'bold', fontSize: 20, paddingBottom: 2 }}>
          {heading}
        </Typography>
      )}
      <UploadFile
        onUpload={onUpload}
        color={color}
        accept={DOCUMENT_ACCEPT}
        maxSize={MAX_DOCUMENT_SIZE_BYTES}
        onRejected={onRejected}
        multiple
        testId="document-upload-input"
      />
    </>
  );
};
