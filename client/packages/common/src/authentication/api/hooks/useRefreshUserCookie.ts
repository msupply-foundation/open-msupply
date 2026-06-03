import { AuthCookie } from '../../AuthContext';
import { useGetUserPermissions } from './useGetUserPermissions';
import { useGetUserDetails } from './useUserDetails';
import { getStore } from './useLogin';
import { AuthenticationCredentials } from '@openmsupply-client/common';

export const useRefreshUserCookie = (
  setCookie: React.Dispatch<React.SetStateAction<AuthCookie | undefined>>,
  cookie?: AuthCookie,
  mostRecentCredentials?: AuthenticationCredentials[]
) => {
  const getUserPermissions = useGetUserPermissions();
  const { mutateAsync: getUserDetails } = useGetUserDetails();

  const refreshUserCookie = async () => {
    const permissions = await getUserPermissions(cookie?.token, cookie?.store);
    const userDetails = await getUserDetails(cookie?.token);
    const store = await getStore(userDetails, mostRecentCredentials);

    const authCookie = {
      ...cookie,
      store,
      token: cookie?.token ?? '',
      user: {
        id: userDetails?.userId ?? '',
        name: cookie?.user?.name ?? '',
        permissions,
        email: userDetails?.email,
        jobTitle: userDetails?.jobTitle,
      },
    };
    setCookie(authCookie);
  };

  return { refreshUserCookie };
};
