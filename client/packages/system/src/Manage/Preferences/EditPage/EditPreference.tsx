import React from 'react';
import {
  BasicSpinner,
  Box,
  DetailPanelSection,
  NothingHere,
  PreferenceDescriptionNode,
  Typography,
  useTranslation,
} from '@openmsupply-client/common';
import { useStores } from '@openmsupply-client/system';
import { usePreferencesByKey } from '../api/usePreferencesByKey';
import { EditField } from './EditField';
import { useEditPreference } from '../api/useEditPreference';

export const EditPreference = ({
  selected,
}: {
  selected: PreferenceDescriptionNode;
}) => {
  const t = useTranslation();

  const { data } = useStores();
  const stores = data?.nodes ?? [];

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
          <Box sx={{ width: 300 }}>
            <EditField
              value={prefs.global?.value}
              preference={selected}
              onChange={value => update({ value, id: prefs?.global?.id })}
            />
          </Box>
        </Box>
      </DetailPanelSection>
      <Box sx={{ height: 10 }} />
      <DetailPanelSection title={t('label.per-store')} defaultExpanded={false}>
        {selected.globalOnly ? (
          <Typography>{t('messages.global-only-preference')}</Typography>
        ) : (
          // TODO: This should be a searchable/filterable table
          // Leaving here for now to see, but probably should leave
          // only global prefs needed for now?
          <Box display="flex" flexDirection="column" gap={1}>
            {stores.map(s => {
              const match = prefs?.perStore.find(p => p.storeId === s.id);

              return (
                <Box
                  display="flex"
                  sx={{
                    backgroundColor: 'white',
                    padding: 0.5,
                    borderRadius: 1,
                  }}
                  key={s.id}
                >
                  <Typography width="200px" fontWeight="bold">
                    {s.storeName}
                  </Typography>
                  <Box sx={{ width: 300 }}>
                    <EditField
                      value={match?.value}
                      preference={selected}
                      onChange={value =>
                        update({ value, storeId: s.id, id: match?.id })
                      }
                    />
                  </Box>
                </Box>
              );
            })}
          </Box>
        )}
      </DetailPanelSection>
    </Box>
  );
};
