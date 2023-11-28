import { useQuery } from 'react-query';
import { useLogApi } from '../utils/useLogApi';

export const useLogContentsByFileName = (fileName: string) => {
  const api = useLogApi();
  const result = useQuery([api.keys.list(), fileName], () =>
    api.get.logContentsByFileName({ fileName })
  );

  return { ...result };
};
