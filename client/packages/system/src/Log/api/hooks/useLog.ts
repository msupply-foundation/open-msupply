import {
  getAuthCookie,
  useDownloadFile,
  useQuery,
} from '@openmsupply-client/common';
import { Environment } from '@openmsupply-client/config';
import { useLogGraphQL } from '../useLogGraphQL';
import { FILE_NAMES, FILE_CONTENT } from './keys';

const authHeaders = () => ({
  Authorization: `Bearer ${getAuthCookie().token}`,
});

// The viewer only loads the tail of a log by default, so very large files (which
// can be tens or hundreds of MB) render instantly. The full file is still
// available via the download/save button.
export const LOG_VIEW_TAIL_BYTES = 1_000_000;

export interface LogFileContent {
  text: string;
  /** True when only the tail of a larger file was returned. */
  truncated: boolean;
  /** Total size of the file in bytes (regardless of tailing). */
  totalSize: number;
}

// Log contents are fetched as raw text over HTTP (rather than via GraphQL as an
// array of lines). This avoids the per-line JSON overhead of the old query and
// lets the same content be displayed, copied and downloaded as the actual file.
// Authentication uses the same Bearer token as the GraphQL client, so it works
// on web and in the Capacitor (Android) app, where cross-origin cookies are
// unreliable.
export const fetchLogFile = async (
  fileName: string,
  options?: { tailBytes?: number }
): Promise<LogFileContent> => {
  const params = new URLSearchParams({ file: fileName });
  if (options?.tailBytes !== undefined) {
    params.set('tail', String(options.tailBytes));
  }

  const response = await fetch(`${Environment.LOG_URL}?${params.toString()}`, {
    method: 'GET',
    credentials: 'include',
    headers: authHeaders(),
  });
  if (!response.ok) {
    throw new Error(`Unable to load log file (${response.status})`);
  }

  const text = await response.text();
  return {
    text,
    truncated: response.headers.get('x-log-truncated') === 'true',
    totalSize: Number(response.headers.get('x-log-total-size') ?? text.length),
  };
};

// Downloads the full log file as a gzip archive (the server compresses plain logs on
// the fly and serves already-rotated `.gz` files as-is). Uses useDownloadFile so the
// save works on both web and the Capacitor (Android) app.
export const useDownloadLogFile = () => {
  const downloadFile = useDownloadFile();
  return (fileName: string) =>
    downloadFile(
      `${Environment.LOG_URL}?file=${encodeURIComponent(fileName)}&download=true`,
      {
        credentials: 'include',
        headers: authHeaders(),
      }
    );
};

export const useLog = (fileName?: string) => {
  // FILE NAMES
  const {
    data: fileNames,
    isLoading: isFileNamesLoading,
    isError: isFileNamesError,
  } = useGetFileNames();

  // LOG CONTENTS
  const {
    data: logContents,
    isLoading: isLogContentsLoading,
    isError: isLogContentsError,
  } = useGetLogContentsByFileName(fileName ?? '');

  return {
    fileNames: {
      data: fileNames,
      isLoading: isFileNamesLoading,
      isError: isFileNamesError,
    },
    logContents: {
      data: logContents,
      isLoading: isLogContentsLoading,
      isError: isLogContentsError,
    },
  };
};

const useGetFileNames = () => {
  const { logApi } = useLogGraphQL();
  const queryKey = [FILE_NAMES];

  const queryFn = async () => {
    const query = await logApi.logFileNames();
    return query?.logFileNames;
  };

  const query = useQuery({
    queryKey,
    queryFn,
  });
  return query;
};

const useGetLogContentsByFileName = (fileName: string) => {
  const queryKey = [FILE_CONTENT, fileName];

  const queryFn = () =>
    fetchLogFile(fileName, { tailBytes: LOG_VIEW_TAIL_BYTES });

  const query = useQuery({
    queryKey,
    queryFn,
    enabled: !!fileName,
  });
  return query;
};
