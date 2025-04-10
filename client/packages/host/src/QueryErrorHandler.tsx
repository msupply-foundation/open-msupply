import React, { useEffect, useState } from 'react';
import { useNotification } from '@common/hooks';
import { useTranslation } from '@common/intl';
import {
  AuthError,
  useLocalStorage,
  useLocation,
  useQueryClient,
} from '@openmsupply-client/common';

export const QueryErrorHandler = () => {
  const client = useQueryClient();
  const { errorWithDetail, error } = useNotification();
  const t = useTranslation();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const location = useLocation();
  const generalError = t('error.general-query-error');
  const [authError] = useLocalStorage('/error/auth');

  useEffect(() => {
    if (!!errorMessage && authError !== AuthError.Unauthenticated) {
      // Show longer error messages with a details view
      if (errorMessage.length > 100) {
        errorWithDetail(errorMessage)();
      } else {
        error(errorMessage);
      }
    }
  }, [errorMessage]);

  useEffect(() => {
    setErrorMessage(null);
  }, [setErrorMessage, location.pathname]);

  useEffect(() => {
    const currentDefaults = client.getDefaultOptions();
    client.setDefaultOptions({
      queries: {
        ...currentDefaults.queries,
        notifyOnChangeProps: 'tracked',
        onError: e => {
          setErrorMessage((e as Error).message || generalError);
        },
      },
      mutations: {
        ...currentDefaults.mutations,
        onError: e => setErrorMessage((e as Error).message || generalError),
      },
    });
  }, []);

  return <></>;
};
