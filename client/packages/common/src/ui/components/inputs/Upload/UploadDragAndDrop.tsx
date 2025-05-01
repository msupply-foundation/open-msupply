import React from 'react';
import Dropzone, { Accept } from 'react-dropzone';
import {
  useTranslation,
  alpha,
  Breakpoints,
  Paper,
  FileUploadIcon,
  Typography,
  BaseButton,
  ButtonWithIcon,
  LinkIcon,
  useAppTheme,
  useMediaQuery,
} from '@openmsupply-client/common';

interface UploadDragAndDropProps {
  accept?: Accept;
  color?: 'primary' | 'secondary' | 'gray';
  maxSize?: number;
  onUpload: <T extends File>(files: T[]) => void;
}

export const UploadDragAndDrop = ({
  accept,
  color = 'secondary',
  onUpload,
}: UploadDragAndDropProps) => {
  const t = useTranslation();
  const theme = useAppTheme();
  const isExtraSmallScreen = useMediaQuery(
    theme.breakpoints.down(Breakpoints.sm)
  );

  return (
    <Paper
      sx={theme => ({
        [theme.breakpoints.down('sm')]: {
          border: '0px',
          borderWidth: '0px',
          backgroundColor: 'inherit',
          width: '200px',
          marginTop: '0px 0px',
          padding: '0px',
          boxShadow: 'none',
        },
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
      })}
    >
      <Dropzone
        onDrop={acceptedFiles => onUpload(acceptedFiles)}
        accept={accept}
      >
        {({ getRootProps, getInputProps }) => (
          <div {...getRootProps()}>
            <input {...getInputProps()} />
            {!isExtraSmallScreen && (
              <>
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
              </>
            )}
            {isExtraSmallScreen && (
              <ButtonWithIcon
                shouldShrink={false}
                color="secondary"
                variant="outlined"
                label={t('button.browse-files')}
                onClick={() => {}}
                Icon={<LinkIcon />}
              />
            )}
          </div>
        )}
      </Dropzone>
    </Paper>
  );
};
