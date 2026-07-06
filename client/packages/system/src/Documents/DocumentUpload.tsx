import React from 'react';
import {
  Typography,
  UploadFile,
  useNotification,
  useTranslation,
} from '@openmsupply-client/common';
import { Environment } from '@openmsupply-client/config';

interface DocumentUploadProps {
  recordId: string;
  tableName: string;
  invalidateQueries?: () => void;
  /** Optional bold heading rendered above the upload zone. */
  heading?: string;
  color?: 'primary' | 'secondary' | 'gray';
}

/**
 * Generic drag-and-drop upload zone that posts files to the sync_files endpoint
 * for the given record, then invalidates the relevant queries.
 */
export const DocumentUpload = ({
  recordId,
  tableName,
  invalidateQueries = () => {},
  heading,
  color = 'gray',
}: DocumentUploadProps) => {
  const t = useTranslation();
  const { error, success } = useNotification();

  const onUpload = async (files: File[]) => {
    if (!recordId) return;

    const url = `${Environment.SYNC_FILES_URL}/${tableName}/${recordId}`;
    const formData = new FormData();
    files?.forEach(file => {
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
      error(t('error.an-error-occurred', { message: response.statusText }))();
    } catch (e) {
      console.error(e);
      error(t('error.an-error-occurred', { message: (e as Error).message }))();
    }
  };

  return (
    <>
      {heading && (
        <Typography
          sx={{ fontWeight: 'bold', fontSize: 20, paddingBottom: 2 }}
        >
          {heading}
        </Typography>
      )}
      <UploadFile onUpload={onUpload} color={color} multiple />
    </>
  );
};
