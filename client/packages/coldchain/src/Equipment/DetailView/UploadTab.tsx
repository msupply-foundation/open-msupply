import React from 'react';
import { AssetLogPanel } from '../Components';
import { Upload } from '@common/components';

const FileList = ({ files }: { files?: File[] }) =>
  files === undefined ? null : (
    <div>{files?.map((file, i) => <div key={i}>{file.name}</div>)}</div>
  );

export const UploadTab = ({ draft, onChange, value }: AssetLogPanel) => {
  const onUpload = (files: File[]) => {
    onChange({ files });
  };

  return (
    <AssetLogPanel value={value} draft={draft} onChange={onChange}>
      <Upload onUpload={onUpload} />
      <FileList files={draft.files} />
    </AssetLogPanel>
  );
};
