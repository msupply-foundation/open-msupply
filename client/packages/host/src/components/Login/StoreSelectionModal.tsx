import React, { useEffect, useMemo, useState } from 'react';
import {
  Autocomplete,
  BasicModal,
  Checkbox,
  LocalStorage,
  LoadingButton,
  useAuthContext,
  useTranslation,
  useUserDetails,
  ModalTitle,
  CheckIcon,
} from '@openmsupply-client/common';
import {
  Box,
  Chip,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Typography,
} from '@mui/material';
import { UserStoreNodeFragment } from '@common/types';

const SKIP_KEY = '/login/store-selection-skip';

interface StoreSelectionModalProps {
  open: boolean;
  onClose: () => void;
  username: string;
}

export const StoreSelectionModal = ({
  open,
  onClose,
  username,
}: StoreSelectionModalProps) => {
  const t = useTranslation();
  const { store, setStore, token } = useAuthContext();
  const { data, isLoading } = useUserDetails(token);
  const [selectedStore, setSelectedStore] =
    useState<UserStoreNodeFragment | null>(null);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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

  // Pre-select the current store whenever the modal opens
  useEffect(() => {
    if (open && store) setSelectedStore(store);
  }, [open, store]);

  // Auto-close when data is loaded if there's nothing to choose from
  useEffect(() => {
    if (!open || isLoading) return;

    const skipPrefs = LocalStorage.getItem(SKIP_KEY);
    if (skipPrefs?.[username.toLowerCase()]) {
      onClose();
      return;
    }

    if (stores.length <= 1) {
      onClose();
    }
  }, [open, isLoading, stores.length, username]);

  const handleConfirm = async () => {
    if (dontShowAgain) {
      const existing = LocalStorage.getItem(SKIP_KEY) ?? {};
      LocalStorage.setItem(SKIP_KEY, {
        ...existing,
        [username.toLowerCase()]: true,
      });
    }

    if (selectedStore && selectedStore.id !== store?.id) {
      setIsSaving(true);
      await setStore(selectedStore);
      setIsSaving(false);
    }

    onClose();
  };

  return (
    <BasicModal open={open} width={480} height={300}>
      <ModalTitle title={t('heading.select-store')} />
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Autocomplete
          options={stores}
          value={selectedStore}
          getOptionLabel={s => s.name}
          isOptionEqualToValue={(a, b) => a.id === b.id}
          onChange={(_, v) => setSelectedStore(v as UserStoreNodeFragment)}
          renderOption={(props, option) => (
            <Box
              component="li"
              {...props}
              key={option.id}
              sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <Typography sx={{ flex: 1 }}>{option.name}</Typography>
              {option.id === defaultStoreId && (
                <Chip
                  label={t('label.default')}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              )}
              {option.id === mruStoreId && (
                <Chip
                  label={t('label.last-used')}
                  size="small"
                  color="secondary"
                  variant="outlined"
                />
              )}
            </Box>
          )}
          loading={isLoading}
          clearable={false}
          width="100%"
          autoFocus
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={dontShowAgain}
              onChange={e => setDontShowAgain(e.target.checked)}
            />
          }
          label={t('message.dont-show-store-selection')}
        />
        <Typography variant="body2" color="textSecondary">
          {t('message.dont-show-store-selection-detail')}
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, justifyContent: 'center' }}>
        <LoadingButton
          startIcon={<CheckIcon />}
          isLoading={isSaving}
          label={t('button.ok')}
          onClick={handleConfirm}
          variant="outlined"
          disabled={!selectedStore}
        />
      </DialogActions>
    </BasicModal>
  );
};
