import React from 'react';
import { AssetLogPanel, FileList } from '../Components';
import { Upload } from '@common/components';

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
      <FileList files={draft.files} removeFile={removeFile} />
    </AssetLogPanel>
  );
};
