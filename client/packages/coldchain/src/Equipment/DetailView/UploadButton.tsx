import React from 'react';
import { ButtonWithIcon } from '@common/components';
import { PlusCircleIcon } from '@common/icons';
import { useTranslation } from '@common/intl';
import { Box, FnUtils } from 'packages/common/src';

export const UploadButton = ({
  onUpload,
  files,
  customLabel,
  icon,
}: {
  onUpload: (files: File[]) => void;
  files: File[] | undefined;
  customLabel?: string;
  icon?: React.ReactNode;
}) => {
  const t = useTranslation();
  const elementId = FnUtils.generateUUID();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
