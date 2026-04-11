import React from 'react';
import { Capacitor } from '@capacitor/core';
import { Accept } from './types';
import { UploadButton } from './UploadButton';
import { UploadDragAndDrop } from './UploadDragAndDrop';

interface UploadFileProps {
  onUpload: (files: File[]) => void;
  files?: File[];
  color?: 'primary' | 'secondary' | 'gray';
  accept?: Accept;
  multiple?: boolean;
}

export const UploadFile = ({
  onUpload,
  files,
  color = 'secondary',
  accept,
  multiple = false,
}: UploadFileProps) => {
  const isNative = Capacitor.isNativePlatform();
  // Convert Accept type to a string for the native file input
  const acceptString = accept
    ? Object.entries(accept)
        .flatMap(([mime, exts]) => [mime, ...exts])
        .join(',')
    : undefined;
  return isNative ? (
    <UploadButton
      onUpload={onUpload}
      files={files}
      accept={acceptString}
      multiple={multiple}
    />
  ) : (
    <UploadDragAndDrop
      onUpload={onUpload}
      color={color}
      accept={accept}
      multiple={multiple}
    />
  );
};
