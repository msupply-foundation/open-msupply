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
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { StoreRowFragment, useStores } from '@openmsupply-client/system';

export const StoreSelector: FC = ({ children }) => {
  const { store, setStore } = useAuthContext();
  const navigate = useNavigate();
  const { hide, PaperClickPopover } = usePaperClickPopover();
  const { data, isLoading } = useStores();
  const t = useTranslation('app');

  const storeSorter = (a: StoreRowFragment, b: StoreRowFragment) => {
    if (a.code < b.code) return -1;
    if (a.code > b.code) return 1;
    return 0;
  };
  const stores = (data?.nodes ?? []).sort(storeSorter);

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
