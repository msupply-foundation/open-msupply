import React, { useEffect } from 'react';
import { useNotification } from '@common/hooks';
import { useTranslation } from '@common/intl';
import { useQueryClient } from 'react-query';

export const QueryErrorHandler = () => {
  const client = useQueryClient();
  const { error } = useNotification();
  const t = useTranslation();

  const generalError = t('error.general-query-error');

  useEffect(() => {
    const currentDefaults = client.getDefaultOptions();
    client.setDefaultOptions({
      queries: {
        ...currentDefaults.queries,
        onError: e => error((e as Error).message || generalError)(),
      },
      mutations: {
        ...currentDefaults.mutations,
        onError: e => error((e as Error).message || generalError)(),
      },
    });
  }, []);

  return <></>;
};
