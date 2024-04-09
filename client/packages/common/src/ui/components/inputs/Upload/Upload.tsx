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
  accept?: Accept;
  color?: 'primary' | 'secondary' | 'gray';
  maxSize?: number;
  onUpload: <T extends File>(files: T[]) => void;
}

export const Upload: FC<UploadProps> = ({
  accept,
  color = 'secondary',
  onUpload,
}) => {
  const t = useTranslation();

  return (
    <Paper
      sx={{
        borderRadius: '16px',
        marginTop: '20px 0',
        backgroundColor: theme => alpha(theme.palette[color].main, 0.1),
        padding: '24px',
        width: '100%',
        alignContent: 'center',
        textAlign: 'center',
        borderStyle: 'dashed',
        borderWidth: '2px',
        borderColor: `${color}.main`,
        ':hover': {
          borderColor: theme => theme.palette[color].dark,
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
                stroke: theme => theme.palette[color].main,
              }}
            />
            <Typography sx={{ fontWeight: 'bold', color: `${color}.main` }}>
              {t('messages.upload-invite')}
            </Typography>
            <Typography color={color}>{t('messages.upload-or')}</Typography>
            <BaseButton color="secondary" variant="outlined">
              {t('button.browse-files')}
            </BaseButton>
          </div>
        )}
      </Dropzone>
    </Paper>
  );
};
