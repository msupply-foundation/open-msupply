import React, { useRef, useState } from 'react';
import {
  useTranslation,
  alpha,
  Paper,
  FileUploadIcon,
  Typography,
  BaseButton,
  ButtonWithIcon,
  LinkIcon,
  useIsExtraSmallScreen,
} from '@openmsupply-client/common';
import { Accept } from './types';

interface UploadDragAndDropProps {
  accept?: Accept;
  color?: 'primary' | 'secondary' | 'gray';
  multiple: boolean;
  onUpload: <T extends File>(files: T[]) => void;
}

/** Convert react-dropzone-style Accept map → native <input accept="..."> string */
const acceptToString = (accept?: Accept): string | undefined => {
  if (!accept) return undefined;
  return Object.entries(accept)
    .flatMap(([mime, exts]) => [mime, ...exts])
    .join(',');
};

export const UploadDragAndDrop = ({
  accept,
  color = 'secondary',
  multiple,
  onUpload,
}: UploadDragAndDropProps) => {
  const t = useTranslation();
  const isExtraSmallScreen = useIsExtraSmallScreen();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    onUpload(Array.from(fileList) as File[]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => setIsDragOver(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleClick = () => inputRef.current?.click();

  return (
    <Paper
      sx={theme => ({
        [theme.breakpoints.down('sm')]: {
          border: '0px',
          borderWidth: '0px',
          backgroundColor: 'inherit',
          width: '200px',
          marginTop: '0px',
          padding: '0px',
          boxShadow: 'none',
        },
        borderRadius: '16px',
        margin: '20px 0',
        backgroundColor: alpha(theme.palette[color].main, isDragOver ? 0.2 : 0.1),
        padding: '24px',
        width: '100%',
        alignContent: 'center',
        textAlign: 'center',
        borderStyle: 'dashed',
        borderWidth: '2px',
        borderColor: `${color}.main`,
        ':hover': {
          borderColor: theme.palette[color].dark,
          cursor: 'pointer',
        },
      })}
    >
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        style={{ cursor: 'pointer' }}
      >
        <input
          ref={inputRef}
          type="file"
          hidden
          multiple={multiple}
          accept={acceptToString(accept)}
          onChange={e => handleFiles(e.target.files)}
          // Reset so the same file can be re-uploaded
          onClick={e => ((e.target as HTMLInputElement).value = '')}
        />
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
    </Paper>
  );
};
