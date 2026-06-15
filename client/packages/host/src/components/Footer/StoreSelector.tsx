import React, { FC, useState, useMemo } from 'react';
import {
  Box,
  Checkbox,
  CircularProgress,
  FlatButton,
  PaperPopoverSection,
  Typography,
  useAuthContext,
  useLocalStorage,
  useTranslation,
  useNavigate,
  useUserDetails,
  BasicTextInput,
  useRootNavigationPath,
  PaperPopover,
} from '@openmsupply-client/common';
import { FormControlLabel } from '@mui/material';
import { PropsWithChildrenOnly, UserStoreNodeFragment } from '@common/types';

export const StoreSelector: FC<PropsWithChildrenOnly> = ({ children }) => {
  const t = useTranslation();
  const navigate = useNavigate();
  const { store, setStore, token, mostRecentUsername } = useAuthContext();
  const { data, isLoading } = useUserDetails(token);
  const [popoverAnchor, setPopoverAnchor] = useState<HTMLElement | null>(null);
  const [skipPrefs, setSkipPrefs] = useLocalStorage(
    '/login/skip-store-selector',
    {}
  );

  // For store selector on login
  const skipKey = (mostRecentUsername ?? '').toLowerCase();
  const rememberChoice = !!(skipPrefs ?? {})[skipKey];
  const setRememberChoice = (checked: boolean) => {
    if (skipKey) setSkipPrefs({ ...(skipPrefs ?? {}), [skipKey]: checked });
  };

  const rootNavigationPath = useRootNavigationPath();

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
        setPopoverAnchor(null);
        navigate(rootNavigationPath);
      }}
      key={s.id}
      sx={buttonStyle}
    />
  ));

  return (
    <PaperPopover
      mode="click"
      placement={{
        vertical: 'top',
        horizontal: 'right',
      }}
      anchorEl={popoverAnchor}
      onAnchorElChange={setPopoverAnchor}
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
                autoFocus
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
                    onClick={() => { }}
                    disabled={true}
                    key="no-results"
                    sx={buttonStyle}
                  />
                )}
              </Box>
              <FormControlLabel
                sx={{ marginTop: 1 }}
                control={
                  <Checkbox
                    checked={rememberChoice}
                    onChange={e => setRememberChoice(e.target.checked)}
                    size="small"
                  />
                }
                label={
                  <Typography
                    sx={{ fontSize: '14px', color: 'text.secondary' }}
                  >
                    {t('message.remember-store-choice')}
                  </Typography>
                }
              />
            </>
          )}
        </PaperPopoverSection>
      }
    >
      {children}
    </PaperPopover>
  );
};
