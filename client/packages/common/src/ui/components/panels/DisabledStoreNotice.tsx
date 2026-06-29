import React from 'react';
import { Alert } from './Alert';
import { useTranslation } from '@common/intl';

interface DisabledStoreNoticeProps {
  otherParty?: { store?: { isDisabled: boolean } | null } | null;
}

export const DisabledStoreNotice = ({
  otherParty,
}: DisabledStoreNoticeProps) => {
  const t = useTranslation();

  if (!otherParty?.store?.isDisabled) return null;

  return (
    <Alert severity="info" sx={{ width: '100%' }}>
      {t('info.cannot-edit-disabled-store')}
    </Alert>
  );
};
