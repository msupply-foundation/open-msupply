import React from 'react';
import { Capacitor } from '@capacitor/core';
import { Accept, FileRejection } from 'react-dropzone';
import { UploadButton } from './UploadButton';
import { UploadDragAndDrop } from './UploadDragAndDrop';

interface UploadFileProps {
  onUpload: (files: File[]) => void;
  files?: File[];
  color?: 'primary' | 'secondary' | 'gray';
  accept?: Accept;
  /** Maximum size per file in bytes; larger files are rejected (drag & drop only). */
  maxSize?: number;
  multiple?: boolean;
  /** Called with files rejected by `accept`/`maxSize` (drag & drop only). */
  onRejected?: (rejections: FileRejection[]) => void;
  /** Stamped on the hidden file input for e2e locators. */
  testId?: string;
}

export const UploadFile = ({
  onUpload,
  files,
  color = 'secondary',
  accept,
  maxSize,
  multiple = false,
  onRejected,
  testId,
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
      testId={testId}
    />
  ) : (
    <UploadDragAndDrop
      onUpload={onUpload}
      color={color}
      accept={accept}
      maxSize={maxSize}
      multiple={multiple}
      onRejected={onRejected}
      testId={testId}
    />
  );
};
