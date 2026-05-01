import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  alpha,
  Box,
  Chip,
  CircularProgress,
  FormControlLabel,
  Typography,
} from '@mui/material';
import {
  Checkbox,
  LocalStorage,
  LoadingButton,
  useAuthContext,
  useTranslation,
  useUserDetails,
  ArrowRightIcon,
} from '@openmsupply-client/common';
import { UserStoreNodeFragment } from '@common/types';

const SKIP_KEY = '/login/store-selection-skip';

interface StoreSelectionPanelProps {
  open: boolean;
  onClose: () => void;
  username: string;
}

export const StoreSelectionPanel = ({
  open,
  onClose,
  username,
}: StoreSelectionPanelProps) => {
  const t = useTranslation();
  const { store, setStore, token } = useAuthContext();
  const { data, isLoading } = useUserDetails(token);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const stores = useMemo(
    () =>
      data?.stores?.nodes
        ?.filter(s => !s.isDisabled)
        .sort((a, b) => a.name.localeCompare(b.name)) ?? [],
    [data?.stores?.nodes]
  );

  const defaultStoreId = data?.defaultStore?.id;

  const mruStoreId = useMemo(() => {
    const raw = LocalStorage.getItem('/mru/credentials');
    const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
    return list.find(c => c.username.toLowerCase() === username.toLowerCase())
      ?.store?.id;
  }, [username]);

  // Set initial selection to the current (auto-selected) store
  useEffect(() => {
    if (stores.length === 0) return;
    const currentIdx = stores.findIndex(s => s.id === store?.id);
    setSelectedIdx(currentIdx >= 0 ? currentIdx : 0);
  }, [stores, store]);

  // Auto-close if conditions don't warrant showing
  useEffect(() => {
    if (!open || isLoading) return;
    const skipPrefs = LocalStorage.getItem(SKIP_KEY);
    if (skipPrefs?.[username.toLowerCase()]) {
      onClose();
      return;
    }
    if (stores.length <= 1) onClose();
  }, [open, isLoading, stores.length, username, onClose]);

  // Scroll selected row into view
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const rows = container.querySelectorAll<HTMLElement>('[data-store-row]');
    rows[selectedIdx]?.scrollIntoView({ block: 'nearest' });
  }, [selectedIdx]);

  const handleSelectStore = useCallback(
    async (s: UserStoreNodeFragment) => {
      if (dontShowAgain) {
        const existing = LocalStorage.getItem(SKIP_KEY) ?? {};
        LocalStorage.setItem(SKIP_KEY, {
          ...existing,
          [username.toLowerCase()]: true,
        });
      }
      setIsSaving(true);
      if (s.id !== store?.id) await setStore(s);
      setIsSaving(false);
      onClose();
    },
    [dontShowAgain, store, setStore, onClose, username]
  );

  // Refs so the global keydown handler always sees current values without
  // needing to be re-registered every time selectedIdx or isSaving change
  const storesRef = useRef(stores);
  storesRef.current = stores;
  const selectedIdxRef = useRef(selectedIdx);
  selectedIdxRef.current = selectedIdx;
  const isSavingRef = useRef(isSaving);
  isSavingRef.current = isSaving;
  const handleSelectStoreRef = useRef(handleSelectStore);
  handleSelectStoreRef.current = handleSelectStore;

  // Capture keyboard events globally while the panel is open so that the
  // user doesn't need to click the table first. The panel sits behind an
  // overflow:hidden parent while it slides in (translateX(100%)), which
  // prevents programmatic focus on some browsers.
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (isSavingRef.current) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIdx(prev =>
          Math.min(prev + 1, storesRef.current.length - 1)
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIdx(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const s = storesRef.current[selectedIdxRef.current];
        if (s) handleSelectStoreRef.current(s);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  if (isLoading) {
    return (
      <Box
        display="flex"
        alignItems="center"
        justifyContent="center"
        height="100%"
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box
      ref={containerRef}
      sx={{
        outline: 'none',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        px: 6,
        py: 5,
      }}
    >
      <Typography variant="h5" fontWeight={600} mb={3}>
        {t('heading.select-store')}
      </Typography>

      <Typography variant="body2" fontWeight={600} paddingBottom={3}>
        Either click on a store to select it and continue or use the{' '}
        <b>up/down arrow keys</b> to highlight a store and press <b>Enter</b> to
        continue. You can also check the box below to skip this selection in the
        future if you always use the same store.
      </Typography>

      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
        }}
      >
        {/* Store rows */}
        {stores.map((s, idx) => (
          <Box
            key={s.id}
            data-store-row
            onClick={() => handleSelectStore(s)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              px: 2,
              py: 1.25,
              cursor: 'pointer',
              borderBottom: '1px solid',
              borderColor: 'divider',
              backgroundColor: theme =>
                idx === selectedIdx
                  ? alpha(theme.palette.primary.main, 0.1)
                  : 'transparent',
              '&:last-child': { borderBottom: 'none' },
              '&:hover': {
                backgroundColor: theme =>
                  idx === selectedIdx
                    ? alpha(theme.palette.primary.main, 0.14)
                    : alpha(theme.palette.primary.main, 0.04),
              },
            }}
          >
            <Typography sx={{ flex: 1 }}>{s.name}</Typography>
            {s.id === defaultStoreId && (
              <Chip
                label={t('label.default')}
                size="small"
                color="primary"
                variant="outlined"
              />
            )}
            {s.id === mruStoreId && (
              <Chip
                label={t('label.last-used')}
                size="small"
                color="secondary"
                variant="outlined"
              />
            )}
          </Box>
        ))}
      </Box>

      <Box
        sx={{
          mt: 2,
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
            />
          }
          label={
            <Typography variant="body2">
              {t('message.dont-show-store-selection')}
            </Typography>
          }
        />
        <LoadingButton
          isLoading={isSaving}
          endIcon={<ArrowRightIcon />}
          label={t('button.continue')}
          onClick={() => {
            const s = stores[selectedIdx];
            if (s) handleSelectStore(s);
          }}
          variant="outlined"
          disabled={stores.length === 0}
        />
      </Box>
    </Box>
  );
};
