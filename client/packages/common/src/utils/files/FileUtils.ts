import { Environment } from '@openmsupply-client/config';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import {
  FileOpener,
  FileOpenerOptions,
} from '@capacitor-community/file-opener';
import { EnvUtils, Formatter, Platform } from '..';
import { getNativeAPI } from '@common/hooks';

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

// On Android, we first try and open the file from the local file system. If
// it's not there (i.e. hasn't been synced before), we attempt to download it
// from the server using the HTTP "File download" endpoint, save it to the local
// file system, then open it from there.
const openAndroidFile = async (file: {
  id: string;
  name: string;
  tableName: string;
  assetId: string;
}) => {
  const filePath = `${Environment.ANDROID_DATA_FILES_PATH}/${file.tableName}/${file.assetId}/${file.id}_${file.name}`;

  let uri: string;

  try {
    if (Capacitor.getPlatform() !== 'android')
      throw new Error('This method is specifically for Android');

    // Check file exists first
    try {
      const result = await Filesystem.stat({
        path: filePath,
        directory: Directory.Data,
      });
      uri = result.uri;
    } catch (e) {
      // The Filesystem.stat method throws an error when file is not found, so
      // we handle the download in the "Catch" block
      console.error("File doesn't exist", e);

      const fileUrl = `${Environment.SYNC_FILES_URL}/${file.tableName}/${file.assetId}/${file.id}`;

      // Download file

      // Ideally we would use the Filesystem.downloadFile() method here, but it
      // doesn't pass through credentials, so we'll have to do it the long way:
      const response = await fetch(fileUrl, {
        headers: {
          Accept: 'application/json',
        },
        credentials: 'include',
      });
      const blob = await response.blob();
      const reader = new FileReader();
      reader.readAsDataURL(blob);

      const base64Data = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          resolve(reader.result as string);
        };
        reader.onerror = reject;
      });
      if (!base64Data) throw new Error('Problem parsing file data');

      // Remove the data URL prefix (e.g., "data:application/pdf;base64,")
      const base64String = base64Data.split(',')[1];
      if (!base64String) throw new Error('Problem parsing base64 string');
      // Save to filesystem
      await Filesystem.writeFile({
        path: filePath,
        data: base64String,
        directory: Directory.Data,
      });

      const uriResult = await Filesystem.getUri({
        path: filePath,
        directory: Directory.Data,
      });
      // console.log('File written');
      uri = uriResult.uri;
    }

    const fileOpenerOptions: FileOpenerOptions = {
      filePath: uri,
      openWithDefault: true,
    };

    await FileOpener.open(fileOpenerOptions);
  } catch (error) {
    console.error('Error opening file:', error);
    throw error;
  }
};

const exportCSV = async (data: string, title: string) => {
  if (EnvUtils.platform === Platform.Android) {
    await getNativeAPI()?.saveFile({
      content: data,
      filename: `${title}.csv`,
      mimeType: 'text/csv',
    });
  } else {
    exportFile(data, 'text/csv', title);
  }
};

export const FileUtils = {
  exportCSV,
  downloadFile,
  openAndroidFile,
};
