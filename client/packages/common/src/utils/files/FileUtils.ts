import { Environment } from '@openmsupply-client/config';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import {
  FileOpener,
  FileOpenerOptions,
} from '@capacitor-community/file-opener';
import { EnvUtils, Formatter, Platform } from '..';
import { useNativeClient, useNotification } from '@common/hooks';
import { useTranslation } from '@openmsupply-client/common';

const useExportFile = () => {
  const t = useTranslation();
  const { success } = useNotification();
  const nativeClient = useNativeClient();
  const successMessage = t('success.data-saved');

  return async (
    data: string | Blob,
    type: string | undefined,
    filename: string
  ) => {
    const isBinaryData = typeof data !== 'string';

    // On android, use the native client to save the file
    if (EnvUtils.platform === Platform.Android) {
      // Content must sent via string for capacitor
      const content = isBinaryData ? await asBase64(data) : data;

      await nativeClient.saveFile({
        content,
        isBinaryData,
        filename,
        mimeType: type,
        successMessage,
      });
    } else {
      // On browser, use HTML link to download the file
      const link = document.createElement('a');

      // Only run on browsers that support HTML5 download attribute
      if (link.download !== undefined) {
        // Content must be a Blob for the browser
        const blob = !isBinaryData
          ? new Blob([data], {
              type: `${type ?? 'text/plain'};charset=utf-8;`,
            })
          : data;

        const url = URL.createObjectURL(blob);
        link.download = filename;
        link.href = url;

        link.click();
        link.remove();
      }
      success(successMessage)();
    }
  };
};

export const useDownloadFile = () => {
  const exportFile = useExportFile();

  return async (url: string, fetchOptions?: RequestInit) => {
    const res = await fetch(url, {
      ...fetchOptions,
    });
    const data = await res.blob();
    const header = res.headers.get('Content-Disposition');
    const filename = header?.match(/filename="(.+)"/)?.[1] ?? getFilename();
    const mimeType = res.headers.get('Content-Type');

    exportFile(data, mimeType ?? undefined, filename);
  };
};

export const useExportCSV = () => {
  const exportFile = useExportFile();

  const exportCsv = async (data: string, title: string) => {
    const filename = getFilename('text/csv', title);
    exportFile(data, 'text/csv', filename);
  };

  return exportCsv;
};

export const useExportLog = () => {
  const exportFile = useExportFile();

  const exportLog = async (data: string, title: string = 'log') => {
    const filename = getFilename(undefined, title); // default to .txt
    exportFile(data, undefined, filename);
  };

  return exportLog;
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
      const base64String = await asBase64(blob);

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

const getFilename = (type?: string, title?: string) => {
  let extension = 'txt';
  switch (type) {
    case 'text/csv':
      extension = 'csv';
      break;
  }

  const today = Formatter.toIsoString(new Date()); // to match backend datetime
  const filename = `${today}_${title || 'export'}.${extension}`;

  return filename;
};

const asBase64 = async (blob: Blob): Promise<string> => {
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

  return base64String;
};

export const FileUtils = {
  openAndroidFile,
};
