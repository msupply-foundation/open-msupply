import React, { FC } from 'react';
import Dropzone, { Accept } from 'react-dropzone';
import { useTranslation } from '@common/intl';
import {
  alpha,
  Paper,
  FileUploadIcon,
  Typography,
  BaseButton,
} from '@openmsupply-client/common';

export interface UploadProps {
  onUpload: <T extends File>(files: T[]) => void;
  accept?: Accept;
  maxSize?: number;
}

export const Upload: FC<UploadProps> = ({ onUpload, accept }) => {
  const t = useTranslation();
  return (
    <Paper
      sx={{
        borderRadius: '16px',
        marginTop: '20px',
        marginBottom: '20px',
        backgroundColor: theme => alpha(theme.palette.secondary.main, 0.1),
        padding: '24px 24px',
        minWidth: '300px',
        width: '100%',
        alignContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
        justifyContent: 'center',
        borderStyle: 'dashed',
        borderWidth: '2px',
        borderColor: 'secondary.main',
        ':hover': {
          borderColor: 'secondary.dark',
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
            <FileUploadIcon
              sx={{
                fontSize: 36,
                stroke: theme => theme.palette.secondary.main,
              }}
            />
            <Typography sx={{ fontWeight: 'bold' }} color="secondary">
              {t('messages.upload-invite')}
            </Typography>
            <Typography color="secondary">{t('messages.upload-or')}</Typography>
            <BaseButton color="secondary" variant="outlined">
              {t('button.browse-files')}
            </BaseButton>
          </div>
        )}
      </Dropzone>
    </Paper>
  );
};
