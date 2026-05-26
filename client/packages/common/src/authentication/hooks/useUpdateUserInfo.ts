import { useState } from 'react';
import { useTranslation } from '@common/intl';
import { AuthState, getAuthState, setAuthState } from '../AuthContext';
import {
  useGetUserPermissions,
  useLastSuccessfulUserSync,
  useUpdateUser,
  useGetUserDetails,
  getStore,
  getMostRecentCredentials,
} from '../api';
import { noOtherVariants } from '../../utils/types';
import { useLocalStorage } from '../../localStorage';

export const useUpdateUserInfo = () => {
  const t = useTranslation();
  const [error, setError] = useState<string | null>(null);
  const { data: lastSuccessfulSync } = useLastSuccessfulUserSync();
  const { mutateAsync: updateUser, isPending: isLoading } = useUpdateUser();
  const getUserPermissions = useGetUserPermissions();
  const { mutateAsync: getUserDetails } = useGetUserDetails();
  const [mruRaw] = useLocalStorage('/mru/credentials');

  return {
    lastSuccessfulSync,
    error,
    isLoading,
    updateUser: async () => {
      setError(null);
      try {
        const update = await updateUser();

        if (update.__typename === 'UpdateUserNode') {
          const state = getAuthState();
          const permissions = await getUserPermissions(state.store);
          const userDetails = await getUserDetails();
          const store = await getStore(
            userDetails,
            getMostRecentCredentials(mruRaw)
          );

          const next: AuthState = {
            ...state,
            isAuthenticated: true,
            store,
            user: {
              id: userDetails?.userId ?? '',
              name: state.user?.name ?? '',
              permissions,
              email: userDetails?.email,
              jobTitle: userDetails?.jobTitle,
            },
          };
          setAuthState(next);
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
