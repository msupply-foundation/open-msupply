import { useQuery } from '@openmsupply-client/common';
import { useLogGraphQL } from '../useLogGraphQL';
import { FILE_NAMES } from './keys';

export const useLog = () => {
  const { data, isLoading, isError } = useGetFileNames();

  return {
    fileNames: { data, isLoading, isError },
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
