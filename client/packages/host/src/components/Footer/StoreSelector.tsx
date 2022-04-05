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
  useUserStores,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { UserStoreNodeFragment } from 'packages/common/src/authentication/api/operations.generated';

const POPPER_HEIGHT = 400;

export const StoreSelector: FC = ({ children }) => {
  const { store, setStore, token } = useAuthContext();
  const navigate = useNavigate();
  const { hide, PaperClickPopover } = usePaperClickPopover();
  const { data, isLoading } = useUserStores(token);
  const t = useTranslation('app');

  const storeSorter = (a: UserStoreNodeFragment, b: UserStoreNodeFragment) => {
    if (a.name < b.name) return -1;
    if (a.name > b.name) return 1;
    return 0;
  };
  const stores = data?.sort(storeSorter) || [];

  if (!store?.name) return null;

  if (stores.length < 2) return <>{children}</>;

  const storeButtons = stores.map(s => (
    <FlatButton
      label={s.name}
      disabled={s.id === store.id}
      onClick={() => {
        setStore(s);
        hide();
        navigate(AppRoute.Dashboard);
      }}
      key={s.id}
      sx={{
        justifyContent: 'flex-start',
        whiteSpace: 'nowrap',
      }}
    />
  ));
  return (
    <PaperClickPopover
      placement="top"
      width={300}
      height={POPPER_HEIGHT}
      Content={
        <PaperPopoverSection label={t('select-store')}>
          {isLoading ? (
            <CircularProgress size={12} />
          ) : (
            <Box
              style={{
                overflowX: 'hidden',
                textOverflow: 'ellipsis',
                overflowY: 'auto',
                maxHeight: POPPER_HEIGHT - 100,
              }}
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
