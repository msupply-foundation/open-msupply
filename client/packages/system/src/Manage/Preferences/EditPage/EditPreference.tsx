import React from 'react';
import {
  BasicSpinner,
  Box,
  DetailPanelSection,
  noOtherVariants,
  NothingHere,
  PreferenceDescriptionNode,
  PreferencesNode,
  PreferenceValueNodeType,
  Switch,
  usePreferences,
  useTranslation,
  isBoolean,
  isNumber,
  NumericTextInput,
} from '@openmsupply-client/common';
import { useEditPreference } from '../api/useEditPreference';

export const EditPreference = ({
  selected,
}: {
  selected: PreferenceDescriptionNode;
}) => {
  const t = useTranslation();

  const { data: prefs, isLoading } = usePreferences();
  const { mutateAsync: update } = useEditPreference();

  // move those up one

  if (isLoading) {
    return <BasicSpinner />;
  }

  // TODO -> nothing here to no sorry, maybe bc
  const prefKey = getPrefKey(selected.key);
  if (!prefs || !prefKey) {
    return <NothingHere />;
  }
  if (!prefs) {
    return <NothingHere />;
  }

  const value = prefs[prefKey];

  const getRenderer = () => {
    switch (selected.valueType) {
      case PreferenceValueNodeType.Boolean:
        if (!isBoolean(value)) {
          return <NothingHere />;
        }
        return (
          <Switch
            checked={value}
            onChange={(_, checked) => update({ [selected.key]: checked })}
          />
        );

      case PreferenceValueNodeType.Integer:
        if (!isNumber(value)) {
          return <NothingHere />;
        }
        return (
          <NumericTextInput
            value={value}
            onChange={newValue => update({ [selected.key]: newValue })}
          />
        );

      default:
        noOtherVariants(selected.valueType);
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

// todo - make key an enum... maybe not at db level idk?
// OK BASICALLY, HOW TO MAKE THIS ERROR WHEN WE ADD A PREF
// argh more tos and froms?
function getPrefKey(
  key: string
): Exclude<keyof PreferencesNode, '__typename'> | undefined {
  switch (key) {
    case 'show_contact_tracing':
      return 'showContactTracing';
  }
}
