import { PreferencesNode } from '@common/types';

export function getPrefKey(key: string): ClientPrefKey | undefined {
  // Typescript error if any keys are missing
  const noMissingKeys: EnsureNoMissingKeys = true;

  if (noMissingKeys) {
    return SERVER_TO_CLIENT_PREFS[key as MappedServerKey];
  }
}

// Mapping between the backend pref key, and the camelcase key from the
// PreferencesNode (not just converting to camelcase, as we might name the key
// differently in the backend vs when served to the frontend)
const SERVER_TO_CLIENT_PREFS = {
  // Add each new pref key here
  ['show_contact_tracing']: 'showContactTracing',
  ['display_population_based_forecasting']: 'displayPopulationBasedForecasting',
} as const;

// Helper types
export type ClientPrefKey = Exclude<keyof PreferencesNode, '__typename'>;

type MappedServerKey = keyof typeof SERVER_TO_CLIENT_PREFS;
type MappedClientKey = (typeof SERVER_TO_CLIENT_PREFS)[MappedServerKey];

type MissingClientKeys = Exclude<ClientPrefKey, MappedClientKey>;

type EnsureNoMissingKeys = [MissingClientKeys] extends [never]
  ? true
  : { error: 'Missing client keys in mapping'; missing: MissingClientKeys };
