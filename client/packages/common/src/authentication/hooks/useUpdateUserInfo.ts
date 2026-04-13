import { useState } from 'react';
import { useTranslation } from '@common/intl';
import { AuthState } from '../AuthContext';
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
  setAuthState: React.Dispatch<React.SetStateAction<AuthState | undefined>>,
  authState?: AuthState,
  mostRecentCredentials?: AuthenticationCredentials[]
) => {
  const t = useTranslation();
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
          const permissions = await getUserPermissions(authState?.store);
          const userDetails = await getUserDetails();
          const store = await getStore(userDetails, mostRecentCredentials);

          setAuthState({
            ...authState,
            store,
            user: {
              id: userDetails?.userId ?? '',
              name: authState?.user?.name ?? '',
              permissions,
              email: userDetails?.email,
              jobTitle: userDetails?.jobTitle,
            },
          });
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
