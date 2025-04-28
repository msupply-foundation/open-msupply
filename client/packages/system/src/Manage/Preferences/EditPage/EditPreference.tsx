import React from 'react';
import {
  Box,
  DetailPanelSection,
  noOtherVariants,
  NothingHere,
  PreferenceValueNodeType,
  Switch,
  useTranslation,
  isBoolean,
  isNumber,
  PreferencesNode,
  UpsertPreferencesInput,
} from '@openmsupply-client/common';
import { ClientPrefKey } from './getPrefKey';

export const EditPreference = ({
  valueType,
  clientKey,
  value,
  update,
}: {
  valueType: PreferenceValueNodeType;
  clientKey: ClientPrefKey;
  value: PreferencesNode[ClientPrefKey];
  update: (input: Partial<UpsertPreferencesInput>) => void;
}) => {
  const t = useTranslation();

  const getRenderer = () => {
    switch (valueType) {
      case PreferenceValueNodeType.Boolean:
        if (!isBoolean(value)) {
          return <NothingHere />;
        }
        return (
          <Switch
            checked={value}
            onChange={(_, checked) => update({ [clientKey]: checked })}
          />
        );

      case PreferenceValueNodeType.Integer:
        if (!isNumber(value)) {
          return <NothingHere />;
        }
        // Adding NumericTextInput here would currently get a type error,
        // because there are no editPreference inputs that accept a number
        return <>To be implemented</>;

      default:
        noOtherVariants(valueType);
    }
  };

  return (
    <Box>
      <DetailPanelSection title={t('label.global-preference')}>
        <Box sx={{ backgroundColor: 'white', padding: 1, borderRadius: 1 }}>
          {getRenderer()}
        </Box>
      </DetailPanelSection>
      <Box sx={{ height: 10 }} />
    </Box>
  );
};
