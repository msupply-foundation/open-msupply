export * from './UploadFile';
// Re-exported so consuming packages can type upload props without a direct
// react-dropzone dependency.
export type { Accept, FileRejection } from 'react-dropzone';
