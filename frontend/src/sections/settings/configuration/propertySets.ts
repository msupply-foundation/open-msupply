// The fixed, built-in property sets Configuration seeds, and the pure logic
// around them (spec/settings/rules.md § Configuration). The sets — ids, keys,
// names, value types, allowed values — conform record-for-record to the
// spec's data appendix, spec/settings/property-sets.md: the ids are upsert
// identities, so they MUST be sent verbatim (a fresh id would collide with
// data seeded by the reference app or an earlier build). Names/values are
// data-side localised en/fr per the appendix (not t() — seeded server data,
// not rendered UI copy).

import type { ConfigureNamePropertiesVariables } from './nameProperties.generated';

export type NamePropertyInput =
  ConfigureNamePropertiesVariables['input'][number];

export const SUPPLY_LEVEL_KEY = 'supply_level';

const LATITUDE_KEY = 'latitude';
const LONGITUDE_KEY = 'longitude';
const FACILITY_TYPE_KEY = 'facility_type';
const OWNERSHIP_TYPE_KEY = 'ownership_type';
const BUFFER_STOCK_KEY = 'buffer_stock';
const SUPPLY_INTERVAL_KEY = 'supply_interval';
const PACKAGING_LEVEL_KEY = 'packaging_level';
const POPULATION_SERVED_KEY = 'population_served';
const ELECTRICITY_AVAILABILITY_KEY = 'electricity_availability';
const SOLAR_AVAILABILITY_KEY = 'solar_availability';
const GAS_AVAILABILITY_KEY = 'gas_availability';
const KEROSENE_AVAILABILITY_KEY = 'kerosene_availability';
const PENTA_3_KEY = 'penta_3';
const ZERO_DOSE_KEY = 'zero_dose';

export const gapsKeys = [
  LATITUDE_KEY,
  LONGITUDE_KEY,
  SUPPLY_LEVEL_KEY,
  FACILITY_TYPE_KEY,
  OWNERSHIP_TYPE_KEY,
  BUFFER_STOCK_KEY,
  SUPPLY_INTERVAL_KEY,
  PACKAGING_LEVEL_KEY,
  POPULATION_SERVED_KEY,
  ELECTRICITY_AVAILABILITY_KEY,
  SOLAR_AVAILABILITY_KEY,
  GAS_AVAILABILITY_KEY,
  KEROSENE_AVAILABILITY_KEY,
  PENTA_3_KEY,
  ZERO_DOSE_KEY,
];

export const forecastingKeys = [
  POPULATION_SERVED_KEY,
  BUFFER_STOCK_KEY,
  SUPPLY_INTERVAL_KEY,
];

// Seeded property display names and allowed values, per data language. The
// English strings double as the fallback for any other locale, matching the
// reference client.
const EN = {
  [POPULATION_SERVED_KEY]: 'Population Served',
  [LATITUDE_KEY]: 'Latitude',
  [LONGITUDE_KEY]: 'Longitude',
  [SUPPLY_LEVEL_KEY]: 'Supply Level',
  [FACILITY_TYPE_KEY]: 'Facility Type',
  [OWNERSHIP_TYPE_KEY]: 'Ownership Type',
  [BUFFER_STOCK_KEY]: 'Stock Safety Buffer (months)',
  [SUPPLY_INTERVAL_KEY]: 'Supply Interval (Months between deliveries)',
  [PACKAGING_LEVEL_KEY]: 'Packaging Level',
  [ELECTRICITY_AVAILABILITY_KEY]: 'Electricity Availability',
  [SOLAR_AVAILABILITY_KEY]: 'Solar Availability',
  [GAS_AVAILABILITY_KEY]: 'Gas Availability',
  [KEROSENE_AVAILABILITY_KEY]: 'Kerosene Availability',
  [PENTA_3_KEY]: 'Penta-3 Coverage',
  [ZERO_DOSE_KEY]: 'Zero Dose Coverage',
} as const;

const FR_NAMES: Record<string, string> = {
  [POPULATION_SERVED_KEY]: 'Population Desservie',
  [LATITUDE_KEY]: 'Latitude',
  [LONGITUDE_KEY]: 'Longitude',
  [SUPPLY_LEVEL_KEY]: "Niveau d'approvisionnement",
  [FACILITY_TYPE_KEY]: "Type d'établissement",
  [OWNERSHIP_TYPE_KEY]: 'Type de propriété',
  [BUFFER_STOCK_KEY]: 'Marge de sécurité des stocks (mois)',
  [SUPPLY_INTERVAL_KEY]:
    "Intervalle d'approvisionnement (Mois entre les livraisons)",
  [PACKAGING_LEVEL_KEY]: 'Niveau de conditionnement',
  [ELECTRICITY_AVAILABILITY_KEY]: 'Disponibilité de l’électricité',
  [SOLAR_AVAILABILITY_KEY]: 'Disponibilité de l’énergie solaire',
  [GAS_AVAILABILITY_KEY]: 'Disponibilité du gaz',
  [KEROSENE_AVAILABILITY_KEY]: 'Disponibilité du kérosène',
  [PENTA_3_KEY]: 'Couverture Penta-3',
  [ZERO_DOSE_KEY]: 'Couverture Zéro Dose',
};

const FR_VALUES: Record<string, string> = {
  'National Vaccine Store': 'Dépôt national de vaccins',
  'Regional Vaccine Store': 'Dépôt régional de vaccins',
  'Referral Hospital': 'Hôpital Général de référence',
  'Municipal Warehouse': 'Entrepôt municipal',
  'Maternal Clinic': 'Clinique de maternité',
  Government: 'Gouvernement',
  NGO: 'ONG',
  Private: 'Privé',
  'Faith-based': 'Confessionnel',
  'Primary (1)': 'Primaire (1)',
  'Secondary (2)': 'Secondaire (2)',
  'Tertiary (3)': 'Tertiaire (3)',
  '> 16 hours': '> 16 heures',
  '8-16 hours': '8-16 heures',
  '< 8 hours': '< 8 heures',
  'No availability': 'Aucun(e) disponibilité',
  Unknown: 'Inconnu(e)',
  Available: 'Disponible',
  Irregular: 'Irrégulier',
  High: 'Élevé(e)',
  Medium: 'Moyen(ne)',
  Low: 'Faible',
};

const propertyName = (key: string, language: string): string =>
  (language === 'fr' ? FR_NAMES[key] : undefined) ?? EN[key as keyof typeof EN];

const allowedValues = (values: string[], language: string): string =>
  values.map(v => (language === 'fr' ? (FR_VALUES[v] ?? v) : v)).join(',');

// The population-based-forecasting set — also a subset of the GAPS set below,
// exactly as in the reference data.
export const forecastingProperties = (
  language: string
): NamePropertyInput[] => [
  {
    id: '7716cecc-7d62-4f1b-93fa-a55a275079b4',
    propertyId: POPULATION_SERVED_KEY,
    key: POPULATION_SERVED_KEY,
    name: propertyName(POPULATION_SERVED_KEY, language),
    valueType: 'FLOAT',
    allowedValues: null,
    remoteEditable: true,
  },
  {
    id: '4396d231-ffc2-485b-9a86-5ccafed0b6d6',
    propertyId: BUFFER_STOCK_KEY,
    key: BUFFER_STOCK_KEY,
    name: propertyName(BUFFER_STOCK_KEY, language),
    valueType: 'FLOAT',
    allowedValues: null,
    remoteEditable: false,
  },
  {
    id: 'd4d252eb-40c6-491c-bd2a-65c74534b966',
    propertyId: SUPPLY_INTERVAL_KEY,
    key: SUPPLY_INTERVAL_KEY,
    name: propertyName(SUPPLY_INTERVAL_KEY, language),
    valueType: 'INTEGER',
    allowedValues: null,
    remoteEditable: false,
  },
];

export const gapsProperties = (language: string): NamePropertyInput[] => [
  {
    id: '0ed01a18-c9ac-4b51-bb56-d5fea4f15feb',
    propertyId: LATITUDE_KEY,
    key: LATITUDE_KEY,
    name: propertyName(LATITUDE_KEY, language),
    valueType: 'FLOAT',
    allowedValues: null,
    remoteEditable: false,
  },
  {
    id: '9d595b3e-2eca-4b1a-983e-77aa34b14e62',
    propertyId: LONGITUDE_KEY,
    key: LONGITUDE_KEY,
    name: propertyName(LONGITUDE_KEY, language),
    valueType: 'FLOAT',
    allowedValues: null,
    remoteEditable: false,
  },
  {
    id: '0e6fa1d3-4762-4b19-a832-1fe8a391e75b',
    propertyId: FACILITY_TYPE_KEY,
    key: FACILITY_TYPE_KEY,
    name: propertyName(FACILITY_TYPE_KEY, language),
    valueType: 'STRING',
    allowedValues: allowedValues(
      [
        'National Vaccine Store',
        'Regional Vaccine Store',
        'Referral Hospital',
        'Municipal Warehouse',
        'Maternal Clinic',
      ],
      language
    ),
    remoteEditable: false,
  },
  {
    id: '098d1c23-1257-451a-a449-500ab3907337',
    propertyId: OWNERSHIP_TYPE_KEY,
    key: OWNERSHIP_TYPE_KEY,
    name: propertyName(OWNERSHIP_TYPE_KEY, language),
    valueType: 'STRING',
    allowedValues: allowedValues(
      ['Government', 'NGO', 'Private', 'Faith-based'],
      language
    ),
    remoteEditable: false,
  },
  {
    // Verbatim from the reference data file — not a valid hex UUID ('4m1c'),
    // but the id is an opaque string on the wire and must match the
    // reference's so re-initialise targets the same record.
    id: 'c5e363fc-40c9-4m1c-b29a-76d74534b077',
    propertyId: PACKAGING_LEVEL_KEY,
    key: PACKAGING_LEVEL_KEY,
    name: propertyName(PACKAGING_LEVEL_KEY, language),
    valueType: 'STRING',
    allowedValues: allowedValues(
      ['Primary (1)', 'Secondary (2)', 'Tertiary (3)'],
      language
    ),
    remoteEditable: true,
  },
  ...forecastingProperties(language),
  {
    id: 'd700e86a-28c9-40a9-830c-f8a9793c63a0',
    propertyId: ELECTRICITY_AVAILABILITY_KEY,
    key: ELECTRICITY_AVAILABILITY_KEY,
    name: propertyName(ELECTRICITY_AVAILABILITY_KEY, language),
    valueType: 'STRING',
    allowedValues: allowedValues(
      ['> 16 hours', '8-16 hours', '< 8 hours', 'No availability', 'Unknown'],
      language
    ),
    remoteEditable: true,
  },
  {
    id: 'cbb104cd-c5f7-4c7a-af5e-ef4ad1b428e0',
    propertyId: SOLAR_AVAILABILITY_KEY,
    key: SOLAR_AVAILABILITY_KEY,
    name: propertyName(SOLAR_AVAILABILITY_KEY, language),
    valueType: 'STRING',
    allowedValues: allowedValues(
      ['> 16 hours', '8-16 hours', '< 8 hours', 'No availability', 'Unknown'],
      language
    ),
    remoteEditable: true,
  },
  {
    id: '633f4741-91ad-46a6-b302-8d1979eb3be4',
    propertyId: GAS_AVAILABILITY_KEY,
    key: GAS_AVAILABILITY_KEY,
    name: propertyName(GAS_AVAILABILITY_KEY, language),
    valueType: 'STRING',
    allowedValues: allowedValues(
      ['No availability', 'Available', 'Irregular', 'Unknown'],
      language
    ),
    remoteEditable: true,
  },
  {
    id: 'a4338ad6-b6eb-46f0-bd8a-217f2820978d',
    propertyId: KEROSENE_AVAILABILITY_KEY,
    key: KEROSENE_AVAILABILITY_KEY,
    name: propertyName(KEROSENE_AVAILABILITY_KEY, language),
    valueType: 'STRING',
    allowedValues: allowedValues(
      ['No availability', 'Available', 'Irregular', 'Unknown'],
      language
    ),
    remoteEditable: true,
  },
  {
    id: '86cb041d-96d3-40f1-874e-4189f4796790',
    propertyId: PENTA_3_KEY,
    key: PENTA_3_KEY,
    name: propertyName(PENTA_3_KEY, language),
    valueType: 'STRING',
    allowedValues: allowedValues(
      ['High', 'Medium', 'Low', 'Unknown'],
      language
    ),
    remoteEditable: true,
  },
  {
    id: '9cc3ac59-061e-4e3f-af13-d2b6d9a52dea',
    propertyId: ZERO_DOSE_KEY,
    key: ZERO_DOSE_KEY,
    name: propertyName(ZERO_DOSE_KEY, language),
    valueType: 'STRING',
    allowedValues: allowedValues(
      ['High', 'Medium', 'Low', 'Unknown'],
      language
    ),
    remoteEditable: true,
  },
];

// "Already configured" — whether any existing property key belongs to the
// set, flipping Initialise → Re-initialise (AC-CN1). GAPS deliberately
// excludes the forecasting subset and the supply-level key, so seeding
// forecasting (or editing supply levels) alone doesn't mark GAPS configured —
// transcribed from the reference client's check.
export const gapsConfigured = (existingKeys: string[]): boolean =>
  existingKeys.some(key =>
    gapsKeys
      .filter(k => !forecastingKeys.includes(k) && k !== SUPPLY_LEVEL_KEY)
      .includes(key)
  );

export const forecastingConfigured = (existingKeys: string[]): boolean =>
  existingKeys.some(key => forecastingKeys.includes(key));

// The supply-level property's allowed values, as edited by S4 — a
// comma-separated string on the wire, a trimmed list in the editor.
export const parseAllowedValues = (
  allowed: string | null | undefined
): string[] =>
  (allowed ?? '')
    .split(',')
    .map(v => v.trim())
    .filter(v => v !== '');

// Values currently recorded against at least one store — not removable
// (AC-CN6). Each store's properties arrive as a JSON string keyed by property
// key; a malformed blob contributes nothing.
export const supplyLevelsInUse = (propertiesJson: string[]): string[] => {
  const inUse: string[] = [];
  for (const json of propertiesJson) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch {
      continue;
    }
    if (typeof parsed !== 'object' || parsed === null) continue;
    const value = (parsed as Record<string, unknown>)[SUPPLY_LEVEL_KEY];
    if (typeof value === 'string' && value.trim() !== '') {
      const trimmed = value.trim();
      if (!inUse.includes(trimmed)) inUse.push(trimmed);
    }
  }
  return inUse;
};

// Add rejects a value already present (duplicates prevented before saving,
// AC-CN6) and ignores blank input; returns the unchanged list on rejection.
export const addSupplyLevel = (values: string[], input: string): string[] => {
  const trimmed = input.trim();
  if (trimmed === '' || values.includes(trimmed)) return values;
  return [...values, trimmed];
};

// The save is a single-element configureNameProperties array carrying the
// full new allowedValues list for the one supply-level property (contract §
// Configuration). The fixed id matches the reference client's.
export const buildSupplyLevelInput = (
  values: string[],
  language: string
): NamePropertyInput[] => [
  {
    id: '3285c231-ffc2-485b-9a86-5ccafed9a5c5',
    propertyId: SUPPLY_LEVEL_KEY,
    key: SUPPLY_LEVEL_KEY,
    name: propertyName(SUPPLY_LEVEL_KEY, language),
    valueType: 'STRING',
    allowedValues: values.join(','),
    remoteEditable: false,
  },
];
