import { useState } from 'react';
import { useTranslation } from '@common/intl';
import { AuthCookie } from '../AuthContext';
import {
  useGetUserPermissions,
  useLastSuccessfulUserSync,
  useUpdateUser,
} from '../api';
import { noOtherVariants } from '../../utils/types';

export const useUpdateUserInfo = (
  setCookie: React.Dispatch<React.SetStateAction<AuthCookie | undefined>>,
  cookie?: AuthCookie
) => {
  const t = useTranslation('app');
  const [error, setError] = useState<string | null>(null);
  const { data: lastSuccessfulSync } = useLastSuccessfulUserSync();
  const { mutateAsync: updateUser, isLoading } = useUpdateUser(
    cookie?.token ?? ''
  );
  const getUserPermissions = useGetUserPermissions();

  return {
    lastSuccessfulSync,
    error,
    isLoading,
    updateUser: async () => {
      setError(null);
      try {
        const update = await updateUser();
        const permissions = await getUserPermissions(
          cookie?.token,
          cookie?.store
        );

        if (update.__typename === 'UpdateUserNode') {
          const authCookie = {
            ...cookie,
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
