import React from 'react';
import {
  Box,
  DetailPanelSection,
  PreferenceDescriptionNode,
  Typography,
  useTranslation,
} from '@openmsupply-client/common';
import { useStores } from '@openmsupply-client/system';
import { JsonData } from '@openmsupply-client/programs';
import { usePreferencesByKey } from '../api/usePreferencesByKey';
import { EditField } from './EditField';

export const EditPreference = ({
  selected,
}: {
  selected: PreferenceDescriptionNode;
}) => {
  const t = useTranslation();

  const { data } = useStores();
  const stores = data?.nodes ?? [];

  const { data: prefs, isLoading } = usePreferencesByKey(selected.key);

  const defaultValue = parse(selected.serialisedDefault);
  const globalValue = prefs?.global ? parse(prefs.global.value) : defaultValue;

  const update = ({
    id,
    value,
    storeId,
  }: {
    id?: string;
    value: JsonData;
    storeId?: string;
  }) => {
    console.log(id, value, storeId);
  };

  if (isLoading) {
    return null;
  }

  return (
    <Box>
      <DetailPanelSection title={t('label.global-preference')}>
        <Box sx={{ width: 300 }}>
          <EditField
            value={globalValue}
            type={selected.jsonFormsInputType}
            onChange={value => update({ value, id: prefs?.global?.id })}
          />
        </Box>
      </DetailPanelSection>
      <Box sx={{ height: 10 }} />
      <DetailPanelSection title={t('label.per-store')}>
        {selected.globalOnly ? (
          <Typography>{t('messages.global-only-preference')}</Typography>
        ) : (
          // TODO: This should be a searchable/filterable table
          <Box display="flex" flexDirection="column" gap={1}>
            {stores.map(s => {
              const match = prefs?.perStore.find(p => p.storeId === s.id);
              const value = match ? parse(match.value) : defaultValue;

              return (
                <Box
                  display="flex"
                  sx={{ backgroundColor: 'white' }}
                  key={s.id}
                >
                  <Typography width="200px" fontWeight="bold">
                    {s.storeName}
                  </Typography>
                  <Box sx={{ width: 300 }}>
                    <EditField
                      value={value}
                      type={selected.jsonFormsInputType}
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

const parse = (value: string) => {
  try {
    return JSON.parse(value);
  } catch (e) {
    return value;
  }
};
