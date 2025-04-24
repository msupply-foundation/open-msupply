import React, { ChangeEvent } from 'react';
import {
  ButtonWithIcon,
  PlusCircleIcon,
  useTranslation,
  Box,
  FnUtils,
} from '@openmsupply-client/common';

export const UploadButton = ({
  onUpload,
  files,
  customLabel,
  icon,
}: {
  onUpload: (files: File[]) => void;
  files?: File[];
  customLabel?: string;
  icon?: React.ReactNode;
}) => {
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
        onChange={handleFileChange}
        style={{ display: 'none' }}
      ></input>
    </Box>
  );
};
