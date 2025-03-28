import React from 'react';
import {
  BasicSpinner,
  Box,
  DetailPanelSection,
  NothingHere,
  PreferenceDescriptionNode,
  PreferenceNode,
  Typography,
  useTranslation,
} from '@openmsupply-client/common';
// import { useStores } from '@openmsupply-client/system';
import { usePreferencesByKey } from '../api/usePreferencesByKey';
import { EditField } from './EditField';
import { useEditPreference } from '../api/useEditPreference';
import { JsonData } from '@openmsupply-client/programs';

export const EditPreference = ({
  selected,
}: {
  selected: PreferenceDescriptionNode;
}) => {
  const t = useTranslation();

  // const { data } = useStores();
  // const stores = data?.nodes ?? [];

  const { data: prefs, isLoading } = usePreferencesByKey(selected.key);
  const { mutateAsync: update } = useEditPreference(selected.key);

  if (isLoading) {
    return <BasicSpinner />;
  }

  if (!prefs) {
    return <NothingHere />;
  }

  return (
    <Box>
      <DetailPanelSection title={t('label.global-preference')}>
        <Box sx={{ backgroundColor: 'white', padding: 1, borderRadius: 1 }}>
          <EditField
            value={prefs.global?.value}
            message={!prefs.global ? t('messages.using-default') : ''}
            config={selected}
            onChange={value => update({ value, id: prefs?.global?.id })}
          />
        </Box>
      </DetailPanelSection>
      <Box sx={{ height: 10 }} />
      <DetailPanelSection title={t('label.per-store')} defaultExpanded={false}>
        <Typography>{t('messages.global-only-preference')}</Typography>

        {/* Once we need more than just global prefs, should show store list here */}
        {/* {selected.globalOnly ? (
          <Typography>{t('messages.global-only-preference')}</Typography>
        ) : (
          // TODO: This should be a searchable/filterable table
          <Box display="flex" flexDirection="column" gap={1}>
            {stores.map(s => {
              const match = prefs?.perStore.find(p => p.storeId === s.id);

              return (
                <StorePrefRow
                  key={s.id}
                  store={s}
                  pref={match}
                  update={update}
                  config={selected}
                  globalValue={prefs.global?.value}
                />
              );
            })}
          </Box>
        )} */}
      </DetailPanelSection>
    </Box>
  );
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const StorePrefRow = ({
  store,
  pref,
  config,
  globalValue,
  update,
}: {
  store: { id: string; storeName: string };
  update: (input: { value: JsonData; storeId: string; id?: string }) => void;
  pref?: PreferenceNode;
  globalValue?: string;
  config: PreferenceDescriptionNode;
}) => {
  const t = useTranslation();

  const message = pref
    ? ''
    : globalValue !== undefined
      ? t('messages.using-global')
      : t('messages.using-default');

  return (
    <Box
      display="flex"
      sx={{ backgroundColor: 'white', padding: 0.5, borderRadius: 1 }}
    >
      <Typography width="200px" fontWeight="bold">
        {store.storeName}
      </Typography>
      <EditField
        value={pref?.value ?? globalValue}
        config={config}
        message={message}
        onChange={value => update({ value, storeId: store.id, id: pref?.id })}
      />
    </Box>
  );
};
