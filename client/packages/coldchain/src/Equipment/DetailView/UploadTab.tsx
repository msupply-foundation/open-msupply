import React from 'react';
import { AssetLogPanel } from '../Components';

export const UploadTab = ({ draft, value }: AssetLogPanel) => {
  return (
    <AssetLogPanel value={value} draft={draft}>
      Upload: {draft.id}
    </AssetLogPanel>
  );
};
