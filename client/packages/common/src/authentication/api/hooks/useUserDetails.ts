import { UserNode } from '@common/types';
import { useMutation, useQuery } from 'react-query';
import { useAuthApi } from './useAuthApi';

export const useGetUserDetails = () => {
  console.info(`************ GET USER DETAILS ************ `);
  const api = useAuthApi();
  return useMutation<
    Partial<UserNode> | undefined,
    unknown,
    string | undefined,
    unknown
  >(api.get.me);
};

export const useUserDetails = (token: string) => {
  console.log('---use---user---details---');
  const api = useAuthApi();
  return useQuery(api.keys.me(token), () => api.get.me(token), {
    enabled: !!token,
  });
};

export const useUserPermissions = () => {
  const api = useAuthApi();
  return useMutation(api.get.permissions);
};
