import React, { useEffect, useState } from 'react';
import { useNotification } from '@common/hooks';
import { useTranslation } from '@common/intl';
import { useQueryClient } from 'react-query';
import { useLocation } from '@openmsupply-client/common';

export const QueryErrorHandler = () => {
  const client = useQueryClient();
  const { error } = useNotification();
  const t = useTranslation();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const location = useLocation();
  const generalError = t('error.general-query-error');

  useEffect(() => {
    if (!!errorMessage) {
      error(errorMessage)();
    }
  }, [errorMessage, location.pathname]);

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
