import { useState } from 'react';
import { useTranslation } from '@common/intl';
import { AuthCookie } from '../AuthContext';
import {
  useGetUserPermissions,
  useLastSuccessfulUserSync,
  useUpdateUser,
  useGetUserDetails,
  getStore,
} from '../api';
import { noOtherVariants } from '../../utils/types';
import { AuthenticationCredentials } from '../../localStorage';

export const useUpdateUserInfo = (
  setCookie: React.Dispatch<React.SetStateAction<AuthCookie | undefined>>,
  cookie?: AuthCookie,
  mostRecentCredentials?: AuthenticationCredentials[]
) => {
  const t = useTranslation('app');
  const [error, setError] = useState<string | null>(null);
  const { data: lastSuccessfulSync } = useLastSuccessfulUserSync();
  const { mutateAsync: updateUser, isLoading } = useUpdateUser();
  const getUserPermissions = useGetUserPermissions();
  const { mutateAsync: getUserDetails } = useGetUserDetails();

  return {
    lastSuccessfulSync,
    error,
    isLoading,
    updateUser: async () => {
      setError(null);
      try {
        const update = await updateUser();

        if (update.__typename === 'UpdateUserNode') {
          const permissions = await getUserPermissions(
            cookie?.token,
            cookie?.store
          );
          const userDetails = await getUserDetails(cookie?.token);
          const store = await getStore(userDetails, mostRecentCredentials);

          const authCookie = {
            ...cookie,
            store,
            token: cookie?.token ?? '',
            user: {
              id: cookie?.user?.id ?? '',
              name: cookie?.user?.name ?? '',
              permissions,
            },
          };
          setCookie(authCookie);
          return;
        }

        if (update.__typename === 'UpdateUserError') {
          switch (update.error.__typename) {
            case 'ConnectionError':
              setError(t('error.connection-error'));
              break;
            case 'InvalidCredentials':
              setError(t('error.invalid-credentials'));
              break;
            case 'MissingCredentials':
              setError(t('error.invalid-credentials'));
              break;
            case 'CentralSyncRequired':
              setError(t('error.missing-central-sync'))
              break;
            default:
              noOtherVariants(update.error);
          }
        }
      } catch (error) {
        setError(String(error));
      }
    },
  };
};
