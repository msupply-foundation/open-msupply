import { useMutation, useQuery } from '@openmsupply-client/common';
import { useLogGraphQL } from '../useLogGraphQL';
import { FILE_NAMES } from './keys';

export const useLog = () => {
  // FILE NAMES
  const {
    data: fileNames,
    isLoading: isFileNamesLoading,
    isError: isFileNamesError,
  } = useGetFileNames();

  // LOG CONTENTS
  const {
    mutateAsync: getLogContents,
    data: logContents,
    isLoading: isLogContentsLoading,
    isError: isLogContentsError,
  } = useGetLogContentsByFileName();

  return {
    fileNames: {
      data: fileNames,
      isLoading: isFileNamesLoading,
      isError: isFileNamesError,
    },
    logContents: {
      mutateAsync: getLogContents,
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

const useGetLogContentsByFileName = () => {
  const { logApi } = useLogGraphQL();
  const mutationKey = [FILE_NAMES];

  const mutationFn = async (fileName: string) => {
    const mutation = await logApi.logContentsByFileName({ fileName });
    return mutation?.logContents;
  };

  const mutation = useMutation({
    mutationKey,
    mutationFn,
  });
  return mutation;
};
