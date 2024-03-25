import React, { FC } from 'react';
import Dropzone, { Accept } from 'react-dropzone';
import { useTranslation } from '@common/intl';
import { Paper, UploadIcon } from '@openmsupply-client/common';

export interface UploadProps {
  onUpload: <T extends File>(files: T[]) => void;
  accept?: Accept;
  maxSize?: number;
}

export const Upload: FC<UploadProps> = ({ onUpload, accept }) => {
  const t = useTranslation('common');
  return (
    <Paper
      sx={{
        borderRadius: '16px',
        marginTop: '20px',
        marginBottom: '20px',
        boxShadow: theme => theme.shadows[1],
        backgroundColor: theme => theme.palette.grey[300],
        padding: '14px 24px',
        minWidth: '300px',
        width: '100%',
        alignContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
        justifyContent: 'center',
        borderStyle: 'dashed',
        borderWidth: '2px',
        borderColor: theme => theme.palette.grey[500],
        ':hover': {
          borderColor: theme => theme.palette.grey[800],
          cursor: 'pointer',
        },
      }}
    >
      <Dropzone
        onDrop={acceptedFiles => onUpload(acceptedFiles)}
        accept={accept}
      >
        {({ getRootProps, getInputProps }) => (
          <div {...getRootProps()}>
            <input {...getInputProps()} />
            <UploadIcon sx={{ fontSize: 100 }} />
            <p>{t('messages.upload-invite')}</p>
          </div>
        )}
      </Dropzone>
    </Paper>
  );
};
