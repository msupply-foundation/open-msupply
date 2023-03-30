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
import { PropsWithChildrenOnly, UserStoreNodeFragment } from '@common/types';

export const StoreSelector: FC<PropsWithChildrenOnly> = ({ children }) => {
  const { store, setStore, token } = useAuthContext();
  const navigate = useNavigate();
  const { hide, PaperClickPopover } = usePaperClickPopover();
  const { data, isLoading } = useUserDetails(token);
  const t = useTranslation('app');

  const storeSorter = (a: UserStoreNodeFragment, b: UserStoreNodeFragment) => {
    if (a.name < b.name) return -1;
    if (a.name > b.name) return 1;
    return 0;
  };
  const stores = data?.stores?.nodes?.sort(storeSorter) || [];
  if (!store?.name) return null;

  if (stores.length < 2) return <>{children}</>;

  const storeButtons = stores.map(s => (
    <FlatButton
      label={s.name}
      disabled={s.id === store.id}
      onClick={async () => {
        await setStore(s);
        hide();
        navigate(AppRoute.Dashboard);
      }}
      key={s.id}
      sx={{
        whiteSpace: 'nowrap',
        overflowX: 'hidden',
        overflowY: 'visible',
        textOverflow: 'ellipsis',
        display: 'block',
        textAlign: 'left',
      }}
    />
  ));
  return (
    <PaperClickPopover
      placement="top"
      width={300}
      Content={
        <PaperPopoverSection label={t('select-store')}>
          {isLoading ? (
            <CircularProgress size={12} />
          ) : (
            <Box
              style={{
                overflowY: 'auto',
                maxHeight: 300,
              }}
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
