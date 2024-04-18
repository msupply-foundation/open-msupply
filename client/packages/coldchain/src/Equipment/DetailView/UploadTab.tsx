import React from 'react';
import { AssetLogPanel, FileList } from '../Components';
import { Upload } from '@common/components';
import { Box } from '@openmsupply-client/common';

export const UploadTab = ({ draft, onChange, value }: AssetLogPanel) => {
  const removeFile = (name: string) => {
    onChange({ files: draft.files?.filter(file => file.name !== name) });
  };

  const onUpload = (files: File[]) => {
    onChange({ files });
  };

  return (
    <AssetLogPanel value={value} draft={draft} onChange={onChange}>
      <Upload onUpload={onUpload} />
      <Box display="flex" sx={{ width: '300px' }}>
        <FileList
          assetId={draft.id ?? ''}
          files={draft.files}
          padding={0.5}
          removeFile={removeFile}
        />
      </Box>
    </AssetLogPanel>
  );
};
