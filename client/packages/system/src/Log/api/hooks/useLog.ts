import { useQuery } from '@openmsupply-client/common';
import { useLogGraphQL } from '../useLogGraphQL';
import { FILE_NAMES } from './keys';

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
  const { logApi } = useLogGraphQL();
  const queryKey = [FILE_NAMES];

  const queryFn = async () => {
    const query = await logApi.logContentsByFileName({
      fileName: fileName,
    });
    return query?.logContents;
  };

  const query = useQuery({
    queryKey,
    queryFn,
    enabled: !!fileName,
  });
  return query;
};
