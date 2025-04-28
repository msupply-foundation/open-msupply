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
} from '@openmsupply-client/common';
import { useEditPreference } from '../api/useEditPreference';

export const EditPreference = ({
  selected,
}: {
  selected: PreferenceDescriptionNode;
}) => {
  const t = useTranslation();

  // TODO - clean up this page and make PR!
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
            onChange={(_, checked) => update({ [prefKey]: checked })}
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

// Mapping between the backend pref key, and the camelcase key from the PreferencesNode
// (not just converting to camelcase, as we might name the key differently in the backend
// vs when served to the frontend)
const SERVER_TO_CLIENT_PREFS = {
  ['show_contact_tracing']: 'showContactTracing',
} as const;

type ServerKey = keyof typeof SERVER_TO_CLIENT_PREFS;
type ClientKey = (typeof SERVER_TO_CLIENT_PREFS)[ServerKey];

type AllClientPrefKeys = Exclude<keyof PreferencesNode, '__typename'>;
type MissingClientKeys = Exclude<AllClientPrefKeys, ClientKey>;

type EnsureNoMissingKeys = [MissingClientKeys] extends [never]
  ? true
  : { error: 'Missing client keys in mapping'; missing: MissingClientKeys };

function getPrefKey(
  key: string
): Exclude<keyof PreferencesNode, '__typename'> | undefined {
  // Typescript error if any keys are missing
  const noMissingKeys: EnsureNoMissingKeys = true;

  if (noMissingKeys) {
    return SERVER_TO_CLIENT_PREFS[key as ServerKey] as
      | Exclude<keyof PreferencesNode, '__typename'>
      | undefined;
  }
}
