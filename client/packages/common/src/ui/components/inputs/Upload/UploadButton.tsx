import React, { ChangeEvent, ReactNode } from 'react';
import {
  ButtonWithIcon,
  PlusCircleIcon,
  useTranslation,
  Box,
  FnUtils,
} from '@openmsupply-client/common';

interface UploadButtonProps {
  onUpload: (files: File[]) => void;
  files?: File[];
  customLabel?: string;
  icon?: ReactNode;
  accept?: string;
  maxFiles?: number;
}

export const UploadButton = ({
  onUpload,
  files,
  customLabel,
  icon,
  accept,
  maxFiles,
}: UploadButtonProps) => {
  const t = useTranslation();
  const elementId = FnUtils.generateUUID();

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const newFileSet = files ?? [];
      for (const file of e.target.files) {
        newFileSet.push(file);
      }

      onUpload(newFileSet);
    }
  };

  return (
    <Box
      sx={{
        padding: 1,
        alignItems: 'center',
      }}
    >
      <ButtonWithIcon
        Icon={icon ? icon : <PlusCircleIcon />}
        label={customLabel || t('button.browse-files')}
        onClick={() => document.getElementById(elementId)?.click()}
        shouldShrink={false}
        color="secondary"
        variant="outlined"
      />
      <input
        id={elementId}
        type="file"
        accept={accept}
        multiple={maxFiles === undefined || maxFiles > 1}
        onChange={handleFileChange}
        style={{ display: 'none' }}
      ></input>
    </Box>
  );
};
