import React from 'react';
import { Capacitor } from '@capacitor/core';
import { UploadButton } from './UploadButton';
import { UploadDragAndDrop } from './UploadDragAndDrop';

interface UploadFileProps {
  onUpload: (files: File[]) => void;
  files?: File[];
  color?: 'primary' | 'secondary' | 'gray';
}

export const UploadFile = ({
  onUpload,
  files,
  color = 'secondary',
}: UploadFileProps) => {
  const isNative = Capacitor.isNativePlatform();
  return isNative ? (
    <UploadButton onUpload={onUpload} files={files} />
  ) : (
    <UploadDragAndDrop onUpload={onUpload} color={color} />
  );
};
