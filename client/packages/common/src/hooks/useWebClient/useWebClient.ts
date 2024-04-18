import { FileInfo } from './types';

export const useWebClient = () => {
  const saveFile = (fileInfo: FileInfo) => {
    const fileData = JSON.stringify({
      name: fileInfo.filename,
      content: fileInfo.content,
    });
    const blob = new Blob([fileData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = fileInfo.filename ?? 'exported-log.txt';
    link.href = url;
    link.click();
  };

  return {
    saveFile,
  };
};
