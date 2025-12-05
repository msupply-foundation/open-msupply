import React, { FC, useState, useMemo } from 'react';
import {
  Box,
  CircularProgress,
  FlatButton,
  PaperPopoverSection,
  useAuthContext,
  useTranslation,
  useNavigate,
  useUserDetails,
  BasicTextInput,
  PersistentPaperPopover,
  usePopover,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { PropsWithChildrenOnly, UserStoreNodeFragment } from '@common/types';

export const StoreSelector: FC<PropsWithChildrenOnly> = ({ children }) => {
  const t = useTranslation();
  const navigate = useNavigate();
  const { store, setStore, token } = useAuthContext();
  const { data, isLoading } = useUserDetails(token);
  const popoverControls = usePopover();

  const storeSorter = (a: UserStoreNodeFragment, b: UserStoreNodeFragment) => {
    if (a.name < b.name) return -1;
    if (a.name > b.name) return 1;
    return 0;
  };
  const stores = useMemo(
    () => data?.stores?.nodes?.sort(storeSorter) || [],
    [data?.stores?.nodes]
  );
  const [search, setSearch] = useState('');

  const filteredStores = useMemo(() => {
    if (!search) return stores;
    return stores.filter(s =>
      s.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [stores, search]);

  if (!store?.name) return null;
  if (stores.length < 2) return <>{children}</>;

  const buttonStyle = {
    whiteSpace: 'nowrap',
    overflowX: 'hidden',
    overflowY: 'visible',
    textOverflow: 'ellipsis',
    display: 'block',
    textAlign: 'left',
  };

  const storeButtons = filteredStores.map(s => (
    <FlatButton
      label={s.name + (s.isDisabled ? ` (${t('label.on-hold')})` : '')}
      disabled={s.id === store.id || !!s.isDisabled}
      onClick={async () => {
        await setStore(s);
        popoverControls.hide();
        navigate(AppRoute.Dashboard);
      }}
      key={s.id}
      sx={buttonStyle}
    />
  ));

  return (
    <PersistentPaperPopover
      popoverControls={popoverControls}
      placement="top"
      width={400}
      Content={
        <PaperPopoverSection label={t('select-store')}>
          {isLoading ? (
            <CircularProgress size={12} />
          ) : (
            <>
              <BasicTextInput
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={t('placeholder.search-by-name')}
                sx={{ marginBottom: 1, width: '100%' }}
              />
              <Box
                style={{
                  overflowY: 'auto',
                  maxHeight: 300,
                  minHeight: 300,
                }}
              >
                {storeButtons.length > 0 ? (
                  storeButtons
                ) : (
                  <FlatButton
                    label={t('control.search.no-results-label')}
                    onClick={() => {}}
                    disabled={true}
                    key="no-results"
                    sx={buttonStyle}
                  />
                )}
              </Box>
            </>
          )}
        </PaperPopoverSection>
      }
    >
      {children}
    </PersistentPaperPopover>
  );
};
