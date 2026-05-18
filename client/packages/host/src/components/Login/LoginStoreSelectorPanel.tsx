import React, { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { Chip, FormControlLabel } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Trans } from 'react-i18next';
import {
  ArrowRightIcon,
  Box,
  Checkbox,
  CircularProgress,
  LoadingButton,
  SearchBar,
  Typography,
  UserStoreNodeFragment,
  getMostRecentCredentials,
  useAuthContext,
  useLocalStorage,
  useTranslation,
  useUserDetails,
} from '@openmsupply-client/common';

interface LoginStoreSelectorPanelProps {
  open: boolean;
  onSelected: () => void;
  username: string;
}

const StoreRow = React.memo(function StoreRow({
  id,
  store,
  isActive,
  isDefault,
  isLastUsed,
  onSelect,
}: {
  id: string;
  store: UserStoreNodeFragment;
  isActive: boolean;
  isDefault: boolean;
  isLastUsed: boolean;
  onSelect: (id: string) => void;
}) {
  const t = useTranslation();
  return (
    <Box
      id={id}
      onClick={() => onSelect(store.id)}
      role="option"
      aria-selected={isActive}
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 1,
        padding: '14px 18px',
        cursor: 'pointer',
        transition: 'background-color 0.1s',
        backgroundColor: theme =>
          isActive ? alpha(theme.palette.primary.main, 0.08) : 'transparent',
        '&:hover': {
          backgroundColor: theme =>
            isActive
              ? alpha(theme.palette.primary.main, 0.14)
              : alpha(theme.palette.primary.main, 0.04),
        },
      }}
    >
      <Typography sx={{ fontSize: '15px', flex: 1 }}>{store.name}</Typography>
      <Box sx={{ display: 'flex', gap: 1 }}>
        {isDefault && (
          <Chip
            label={t('label.default')}
            size="small"
            color="primary"
            variant="outlined"
          />
        )}
        {isLastUsed && (
          <Chip
            label={t('label.last-used')}
            size="small"
            color="secondary"
            variant="outlined"
          />
        )}
      </Box>
    </Box>
  );
});

export const LoginStoreSelectorPanel = ({
  open,
  onSelected,
  username,
}: LoginStoreSelectorPanelProps) => {
  const t = useTranslation();
  const listboxId = useId();
  const optionId = useCallback(
    (storeId: string) => `${listboxId}-${storeId}`,
    [listboxId]
  );
  const { token, store: currentStore, setStore } = useAuthContext();
  const { data, isLoading } = useUserDetails(token);
  const [skipPrefs, setSkipPrefs] = useLocalStorage(
    '/login/skip-store-selector',
    {}
  );
  const [mruCreds] = useLocalStorage('/mru/credentials');

  const allStores: UserStoreNodeFragment[] = useMemo(
    () =>
      (data?.stores?.nodes ?? [])
        .filter(s => !s.isDisabled)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [data?.stores?.nodes]
  );

  const defaultStoreId = data?.defaultStore?.id;
  const [lastUsedStoreId, setLastUsedStoreId] = useState<string | undefined>(
    undefined
  );
  const [lastUsedCaptured, setLastUsedCaptured] = useState(false);
  if (!lastUsedCaptured && open && username) {
    const mru = getMostRecentCredentials(mruCreds ?? null).find(
      item => item.username.toLowerCase() === username.toLowerCase()
    );
    setLastUsedStoreId(mru?.store?.id);
    setLastUsedCaptured(true);
  }

  const orderedStores = useMemo(() => {
    const pinnedIds = [defaultStoreId, lastUsedStoreId].filter(
      (id): id is string => !!id
    );
    const seen = new Set<string>();
    const ordered: UserStoreNodeFragment[] = [];
    pinnedIds.forEach(id => {
      const s = allStores.find(store => store.id === id);
      if (s && !seen.has(s.id)) {
        ordered.push(s);
        seen.add(s.id);
      }
    });
    allStores.forEach(s => {
      if (!seen.has(s.id)) ordered.push(s);
    });
    return ordered;
  }, [allStores, defaultStoreId, lastUsedStoreId]);

  // Auto-close when this panel shouldn't actually be shown for this user.
  useEffect(() => {
    if (!open || isLoading) return;
    if ((skipPrefs ?? {})[username.toLowerCase()]) {
      onSelected();
      return;
    }
    if (allStores.length <= 1) onSelected();
  }, [open, isLoading, allStores.length, username, onSelected, skipPrefs]);

  const [selected, setSelected] = useState<string | undefined>();
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [query, setQuery] = useState('');

  const visibleStores = useMemo(() => {
    if (!query) return orderedStores;
    const q = query.toLowerCase();
    return orderedStores.filter(s => s.name.toLowerCase().includes(q));
  }, [orderedStores, query]);

  const selectedId = useMemo(() => {
    const stores = [selected, defaultStoreId, lastUsedStoreId];
    for (const id of stores) {
      if (id && visibleStores.some(s => s.id === id)) return id;
    }
    return visibleStores[0]?.id;
  }, [selected, defaultStoreId, lastUsedStoreId, visibleStores]);

  const confirm = useCallback(
    async (id: string | undefined) => {
      const chosen = allStores.find(s => s.id === id);
      if (!chosen || isLoggingIn) return;
      setIsLoggingIn(true);
      try {
        if (dontShowAgain) {
          setSkipPrefs({
            ...(skipPrefs ?? {}),
            [username.toLowerCase()]: true,
          });
        }
        if (chosen.id !== currentStore?.id) await setStore(chosen);
        onSelected();
      } finally {
        setIsLoggingIn(false);
      }
    },
    [
      allStores,
      isLoggingIn,
      dontShowAgain,
      skipPrefs,
      setSkipPrefs,
      username,
      currentStore?.id,
      setStore,
      onSelected,
    ]
  );

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (isLoggingIn) return;
      if (e.key === 'Enter') {
        e.preventDefault();
        void confirm(selectedId);
        return;
      }
      const key = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0;
      if (!key || visibleStores.length === 0) return;
      e.preventDefault();
      const len = visibleStores.length;
      const idx = selectedId
        ? visibleStores.findIndex(s => s.id === selectedId)
        : key === 1
          ? -1
          : 0;
      const nextId = visibleStores[(idx + key + len) % len]?.id;
      if (!nextId) return;
      setSelected(nextId);
      requestAnimationFrame(() => {
        document
          .getElementById(optionId(nextId))
          ?.scrollIntoView({ block: 'nearest' });
      });
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, isLoggingIn, visibleStores, selectedId, confirm, optionId]);

  if (!open) return null;

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        padding: '32px 40px 28px',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Typography
        sx={{
          fontSize: '28px',
          fontWeight: 700,
          color: 'text.primary',
          marginBottom: 2,
        }}
      >
        {t('heading.select-store')}
      </Typography>
      <Typography
        sx={{
          fontSize: '14px',
          color: 'text.primary',
          lineHeight: 1.6,
          marginBottom: 3,
        }}
      >
        <Trans
          i18nKey="messages.select-store-instructions"
          components={{ bold: <b /> }}
        />
      </Typography>

      <Box
        sx={{
          marginBottom: 2,
          '& .MuiInputBase-root': {
            backgroundColor: 'background.paper',
          },
        }}
      >
        <SearchBar
          value={query}
          onChange={setQuery}
          placeholder={t('placeholder.search-by-name')}
          debounceTime={0}
          autoFocus
        />
      </Box>

      <Box
        sx={{
          flex: 1,
          backgroundColor: 'background.paper',
          borderRadius: '4px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          marginBottom: 3,
        }}
      >
        {isLoading ? (
          <Box display="flex" justifyContent="center" padding={4}>
            <CircularProgress size={24} />
          </Box>
        ) : visibleStores.length === 0 ? (
          <Box display="flex" justifyContent="center" padding={4}>
            <Typography sx={{ color: 'text.secondary' }}>
              {t('error.no-results')}
            </Typography>
          </Box>
        ) : (
          <Box
            id={listboxId}
            role="listbox"
            aria-label={t('heading.select-store')}
            aria-activedescendant={
              selectedId ? optionId(selectedId) : undefined
            }
            sx={{ overflowY: 'auto', flex: 1 }}
          >
            {visibleStores.map(s => (
              <StoreRow
                key={s.id}
                id={optionId(s.id)}
                store={s}
                isActive={s.id === selectedId}
                isDefault={s.id === defaultStoreId}
                isLastUsed={s.id === lastUsedStoreId}
                onSelect={setSelected}
              />
            ))}
          </Box>
        )}
      </Box>

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <FormControlLabel
          control={
            <Checkbox
              checked={dontShowAgain}
              onChange={e => setDontShowAgain(e.target.checked)}
              size="small"
            />
          }
          label={
            <Typography sx={{ fontSize: '14px', color: 'text.secondary' }}>
              {t('message.remember-store-choice')}
            </Typography>
          }
        />
        <LoadingButton
          shouldShrink={false}
          isLoading={isLoggingIn}
          variant="outlined"
          endIcon={<ArrowRightIcon />}
          disabled={!selectedId || isLoggingIn}
          onClick={() => void confirm(selectedId)}
          label={t('button.continue')}
        />
      </Box>
    </Box>
  );
};
