import { AuthCookie, setAuthCookie } from '../../AuthContext';
import { useAuthApi } from './useAuthApi';
import { useGetUserPermissions } from './useGetUserPermissions';
import { useGetUserDetails } from './useUserDetails';
import { getStore } from './useLogin';
import {
  AuthenticationCredentials,
  useQueryClient,
} from '@openmsupply-client/common';

export const useRefreshUserCookie = (
  setCookie: React.Dispatch<React.SetStateAction<AuthCookie | undefined>>,
  cookie?: AuthCookie,
  mostRecentCredentials?: AuthenticationCredentials[]
) => {
  const getUserPermissions = useGetUserPermissions();
  const { mutateAsync: getUserDetails } = useGetUserDetails();
  const queryClient = useQueryClient();
  const api = useAuthApi();

  const refreshUserCookie = async () => {
    if (!cookie?.token) return;

    const userDetails = await getUserDetails(cookie.token);
    queryClient.setQueryData(api.keys.me(cookie.token), userDetails);
    const store = await getStore(userDetails, mostRecentCredentials);
    const permissions = await getUserPermissions(cookie.token, store);

    const refreshed: AuthCookie = {
      ...cookie,
      store,
      token: cookie.token,
      user: {
        id: userDetails?.userId ?? '',
        name: cookie.user?.name ?? '',
        permissions,
        email: userDetails?.email,
        jobTitle: userDetails?.jobTitle,
      },
    };
    setAuthCookie(refreshed);
    setCookie(refreshed);
  };

  return { refreshUserCookie };
};
