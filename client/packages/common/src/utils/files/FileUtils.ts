import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import {
  FileOpener,
  FileOpenerOptions,
} from '@capacitor-community/file-opener';
import { Formatter } from '..';

const exportFile = (data: string, type: string, title?: string) => {
  let extension = 'txt';
  switch (type) {
    case 'text/csv':
      extension = 'csv';
      break;
  }

  const today = Formatter.naiveDate(new Date());
  const filename = `${title || 'export'}_${today}.${extension}`;
  const blob = new Blob([data], { type: `${type};charset=utf-8;` });
  const link = document.createElement('a');

  // Browsers that support HTML5 download attribute
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

// TODO this causes electron app to navigate to this url (at the same time as opening dialog box)
// however for temp files, this causes Static file not found error as the temp file is delete after first request
const downloadFile = async (url: string) => {
  const res = await fetch(url);
  const data = await res.blob();
  const header = res.headers.get('Content-Disposition');
  const filename = header?.match(/filename="(.+)"/)?.[1];
  const a = document.createElement('a');
  a.href = window.URL.createObjectURL(data);
  if (filename) a.download = filename;
  a.click();
  a.remove();
};

const openAndroidFile = async (filePath: string) => {
  console.log('Attempting to open', filePath);
  try {
    // console.log('URI is', JSON.stringify(uriResult, null, 2));

    if (Capacitor.getPlatform() !== 'android')
      throw new Error('This method is specifically for Android');

    // Get the full URI for the file
    const uriResult = await Filesystem.getUri({
      path: filePath,
      directory: Directory.Data,
    });

    console.log('File URI', JSON.stringify(uriResult, null, 2));

    const fileOpenerOptions: FileOpenerOptions = {
      filePath: uriResult.uri,
      // contentType: 'application/pdf',
      openWithDefault: true,
    };

    await FileOpener.open(fileOpenerOptions);

    console.log('File opened successfully');
  } catch (error) {
    console.error('Error opening file:', error);
    throw error;
  }
};

export const FileUtils = {
  exportCSV: (data: string, title: string) =>
    exportFile(data, 'text/csv', title),
  downloadFile,
  openAndroidFile,
};
