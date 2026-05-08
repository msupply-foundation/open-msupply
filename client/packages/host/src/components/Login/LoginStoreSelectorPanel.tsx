import React, {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
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
  rowRef,
}: {
  id: string;
  store: UserStoreNodeFragment;
  isActive: boolean;
  isDefault: boolean;
  isLastUsed: boolean;
  onSelect: (id: string) => void;
  rowRef?: React.Ref<HTMLDivElement>;
}) {
  const t = useTranslation();
  return (
    <Box
      id={id}
      ref={rowRef}
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
  const lastUsedStoreId = useMemo(() => {
    if (!username) return undefined;
    const mru = getMostRecentCredentials(mruCreds ?? null).find(
      item => item.username.toLowerCase() === username.toLowerCase()
    );
    return mru?.store?.id;
  }, [username, mruCreds]);

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

  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [query, setQuery] = useState('');
  const activeRowRef = useRef<HTMLDivElement | null>(null);
  const hasScrolledOnceRef = useRef(false);
  const hasInitializedRef = useRef(false);
  const handleStoreSelect = useCallback(
    (id: string) => setSelectedId(id),
    []
  );

  const visibleStores = useMemo(() => {
    if (!query) return orderedStores;
    const q = query.toLowerCase();
    return orderedStores.filter(s => s.name.toLowerCase().includes(q));
  }, [orderedStores, query]);

  useEffect(() => {
    if (isLoading || hasInitializedRef.current || allStores.length === 0)
      return;
    hasInitializedRef.current = true;
    if (defaultStoreId && allStores.some(s => s.id === defaultStoreId)) {
      setSelectedId(defaultStoreId);
    } else if (
      lastUsedStoreId &&
      allStores.some(s => s.id === lastUsedStoreId)
    ) {
      setSelectedId(lastUsedStoreId);
    } else {
      setSelectedId(allStores[0]?.id);
    }
  }, [isLoading, allStores, defaultStoreId, lastUsedStoreId]);

  // Re-anchor selection to the first visible row whenever the filter hides
  // the previously-selected one.
  useEffect(() => {
    if (!selectedId) return;
    if (!visibleStores.some(s => s.id === selectedId)) {
      setSelectedId(visibleStores[0]?.id);
    }
  }, [visibleStores, selectedId]);

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

  const selectedIdRef = useRef(selectedId);
  const visibleStoresRef = useRef(visibleStores);
  const confirmRef = useRef(confirm);
  useEffect(() => {
    selectedIdRef.current = selectedId;
    visibleStoresRef.current = visibleStores;
    confirmRef.current = confirm;
  });

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (isLoggingIn) return;
      const stores = visibleStoresRef.current;
      const current = selectedIdRef.current;
      if (e.key === 'Enter') {
        e.preventDefault();
        void confirmRef.current(current);
        return;
      }
      const key =
        e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0;
      if (!key || stores.length === 0) return;
      e.preventDefault();
      const len = stores.length;
      const idx = current
        ? stores.findIndex(s => s.id === current)
        : key === 1
          ? -1
          : 0;
      setSelectedId(stores[(idx + key + len) % len]?.id);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, isLoggingIn]);

  useEffect(() => {
    if (!selectedId) return;
    if (!hasScrolledOnceRef.current) {
      hasScrolledOnceRef.current = true;
      return;
    }
    activeRowRef.current?.scrollIntoView({ block: 'nearest' });
  }, [selectedId]);

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
            {visibleStores.map(s => {
              const isActive = s.id === selectedId;
              return (
                <StoreRow
                  key={s.id}
                  id={optionId(s.id)}
                  store={s}
                  isActive={isActive}
                  isDefault={s.id === defaultStoreId}
                  isLastUsed={s.id === lastUsedStoreId}
                  onSelect={handleStoreSelect}
                  rowRef={isActive ? activeRowRef : undefined}
                />
              );
            })}
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
              {t('message.dont-show-store-selection')}
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
