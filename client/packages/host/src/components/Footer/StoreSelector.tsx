import React, { FC } from 'react';
import {
  Box,
  CircularProgress,
  FlatButton,
  PaperPopoverSection,
  useAuthContext,
  usePaperClickPopover,
  useTranslation,
  useNavigate,
  useUserDetails,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { UserStoreNodeFragment } from 'packages/common/src/authentication/api/operations.generated';

export const StoreSelector: FC = ({ children }) => {
  const { store, setStore, token } = useAuthContext();
  const navigate = useNavigate();
  const { hide, PaperClickPopover } = usePaperClickPopover();
  const { data, isLoading } = useUserDetails(token);
  const t = useTranslation('app');

  const storeSorter = (a: UserStoreNodeFragment, b: UserStoreNodeFragment) => {
    if (a.code < b.code) return -1;
    if (a.code > b.code) return 1;
    return 0;
  };
  const stores = (data?.stores?.nodes ?? []).sort(storeSorter);

  if (!store?.code) return null;

  if (stores.length < 2) return <>{children}</>;

  const storeButtons = stores.map(s => (
    <FlatButton
      label={s.code}
      disabled={s.id === store.id}
      onClick={() => {
        setStore(s);
        hide();
        navigate(AppRoute.Dashboard);
      }}
      key={s.id}
    />
  ));
  return (
    <PaperClickPopover
      placement="top"
      width={250}
      Content={
        <PaperPopoverSection label={t('select-store')}>
          {isLoading ? (
            <CircularProgress size={12} />
          ) : (
            <Box
              style={{ maxHeight: '200px', overflowY: 'auto' }}
              display="flex"
              flexDirection="column"
            >
              {storeButtons}
            </Box>
          )}
        </PaperPopoverSection>
      }
    >
      {children}
    </PaperClickPopover>
  );
};
