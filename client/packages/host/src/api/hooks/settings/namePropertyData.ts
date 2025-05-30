import { SupportedLocales } from '@common/intl';
import {
  ConfigureNamePropertyInput,
  PropertyNodeValueType,
} from '@common/types';

import {
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
} from './namePropertyKeys';

export type LocalisedNamePropertyConfig = Partial<
  Record<SupportedLocales, ConfigureNamePropertyInput[]>
> & {
  en: ConfigureNamePropertyInput[];
};

const enTranslations: Record<string, string> | null = {
  POPULATION_SERVED_KEY: 'Population Served',
  LATITUDE_KEY: 'Latitude',
  LONGITUDE_KEY: 'Longitude',
  SUPPLY_LEVEL_KEY: 'Supply Level',
  FACILITY_TYPE_KEY: 'Facility Type',
  OWNERSHIP_TYPE_KEY: 'Ownership Type',
  BUFFER_STOCK_KEY: 'Stock Safety Buffer (months)',
  SUPPLY_INTERVAL_KEY: 'Supply Interval (Months between deliveries)',
  PACKAGING_LEVEL_KEY: 'Packaging Level',
  ELECTRICITY_AVAILABILITY_KEY: 'Electricity Availability',
  SOLAR_AVAILABILITY_KEY: 'Solar Availability',
  GAS_AVAILABILITY_KEY: 'Gas Availability',
  KEROSENE_AVAILABILITY_KEY: 'Kerosene Availability',
  PENTA_3_KEY: 'Penta-3 Coverage',
  ZERO_DOSE_KEY: 'Zero Dose Coverage',
};

// French Translations
const frTranslations: Record<string, string> | null = {
  POPULATION_SERVED_KEY: 'Population Desservie',
  LATITUDE_KEY: 'Latitude',
  LONGITUDE_KEY: 'Longitude',
  SUPPLY_LEVEL_KEY: "Niveau d'approvisionnement",
  FACILITY_TYPE_KEY: "Type d'etablissement",
  OWNERSHIP_TYPE_KEY: 'Type de propriété',
  BUFFER_STOCK_KEY: 'Marge de sécurité des stocks (mois)',
  SUPPLY_INTERVAL_KEY:
    "Intervalle d'approvisionnement (Mois entre les livraisons)",
  PACKAGING_LEVEL_KEY: 'Niveau de conditionnement',
  ELECTRICITY_AVAILABILITY_KEY: 'Disponibilité de l’électricité',
  SOLAR_AVAILABILITY_KEY: 'Disponibilité de l’énergie solaire',
  GAS_AVAILABILITY_KEY: 'Disponibilité du gaz',
  KEROSENE_AVAILABILITY_KEY: 'Disponibilité du kérosène',
  PENTA_3_KEY: 'Couverture Penta-3',
  ZERO_DOSE_KEY: 'Couverture Zéro Dose',
  // Allowed values translations
  Primary: 'Niveau national',
  'Sub-National': 'Niveau régional',
  'Lowest Distribution': 'Niveau district',
  'Service Point': 'Point de service',
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

const populationServed: ConfigureNamePropertyInput = {
  id: '7716cecc-7d62-4f1b-93fa-a55a275079b4',
  propertyId: POPULATION_SERVED_KEY,
  key: POPULATION_SERVED_KEY,
  name: 'Population Served',
  valueType: PropertyNodeValueType.Float,
  allowedValues: null,
  remoteEditable: true,
};

function translateAllowedValues(
  allowedValues: string | null,
  translations: Record<string, string> | null
): string | null {
  if (!allowedValues || !translations) return allowedValues;

  return allowedValues
    .split(',')
    .map(value => translations[value.trim()] || value.trim())
    .join(',');
}

function getGapsPropertiesForLanguage(language: string) {
  const translations = language === 'fr' ? frTranslations : enTranslations;
  return [
    {
      id: '0ed01a18-c9ac-4b51-bb56-d5fea4f15feb',
      propertyId: LATITUDE_KEY,
      key: LATITUDE_KEY,
      name: translations?.[LATITUDE_KEY] ?? 'Latitude',
      valueType: PropertyNodeValueType.Float,
      allowedValues: null,
      remoteEditable: false,
    },
    {
      id: '9d595b3e-2eca-4b1a-983e-77aa34b14e62',
      propertyId: LONGITUDE_KEY,
      key: LONGITUDE_KEY,
      name: translations?.[LONGITUDE_KEY] ?? 'Longitude',
      valueType: PropertyNodeValueType.Float,
      allowedValues: null,
      remoteEditable: false,
    },
    {
      id: '3285c231-ffc2-485b-9a86-5ccafed9a5c5',
      propertyId: SUPPLY_LEVEL_KEY,
      key: SUPPLY_LEVEL_KEY,
      name: translations?.[SUPPLY_LEVEL_KEY] ?? 'Supply Level',
      valueType: PropertyNodeValueType.String,
      allowedValues: translateAllowedValues(
        'Primary,Sub-National,Lowest Distribution,Service Point',
        translations
      ),
      remoteEditable: false,
    },
    {
      id: '0e6fa1d3-4762-4b19-a832-1fe8a391e75b',
      propertyId: FACILITY_TYPE_KEY,
      key: FACILITY_TYPE_KEY,
      name: translations?.[FACILITY_TYPE_KEY] ?? 'Facility Type',
      valueType: PropertyNodeValueType.String,
      allowedValues: translateAllowedValues(
        'National Vaccine Store,Regional Vaccine Store,Referral Hospital,Municipal Warehouse,Maternal Clinic',
        translations
      ),
      remoteEditable: false,
    },
    {
      id: '098d1c23-1257-451a-a449-500ab3907337',
      propertyId: OWNERSHIP_TYPE_KEY,
      key: OWNERSHIP_TYPE_KEY,
      name: translations?.[OWNERSHIP_TYPE_KEY] ?? 'Ownership Type',
      valueType: PropertyNodeValueType.String,
      allowedValues: translateAllowedValues(
        'Government,NGO,Private,Faith-based',
        translations
      ),
      remoteEditable: false,
    },
    {
      id: '4396d231-ffc2-485b-9a86-5ccafed0b6d6',
      propertyId: BUFFER_STOCK_KEY,
      key: BUFFER_STOCK_KEY,
      name: translations?.[BUFFER_STOCK_KEY] ?? 'Stock Safety Buffer (months)',
      valueType: PropertyNodeValueType.Integer,
      allowedValues: null,
      remoteEditable: false,
    },
    {
      id: 'd4d252eb-40c6-491c-bd2a-65c74534b966',
      propertyId: SUPPLY_INTERVAL_KEY,
      key: SUPPLY_INTERVAL_KEY,
      name:
        translations?.[SUPPLY_INTERVAL_KEY] ??
        'Supply Interval (Months between deliveries)',
      valueType: PropertyNodeValueType.Integer,
      allowedValues: null,
      remoteEditable: false,
    },
    {
      id: 'c5e363fc-40c9-4m1c-b29a-76d74534b077',
      propertyId: PACKAGING_LEVEL_KEY,
      key: PACKAGING_LEVEL_KEY,
      name: translations?.[PACKAGING_LEVEL_KEY] ?? 'Packaging Level',
      valueType: PropertyNodeValueType.String,
      allowedValues: translateAllowedValues(
        'Primary (1),Secondary (2),Tertiary (3)',
        translations
      ),
      remoteEditable: true,
    },
    {
      ...populationServed,
      name: translations?.[POPULATION_SERVED_KEY] ?? 'Population Served',
    },
    {
      id: 'd700e86a-28c9-40a9-830c-f8a9793c63a0',
      propertyId: ELECTRICITY_AVAILABILITY_KEY,
      key: ELECTRICITY_AVAILABILITY_KEY,
      name:
        translations?.[ELECTRICITY_AVAILABILITY_KEY] ??
        'Electricity Availability',
      valueType: PropertyNodeValueType.String,
      allowedValues: translateAllowedValues(
        '> 16 hours,8-16 hours,< 8 hours,No availability,Unknown',
        translations
      ),
      remoteEditable: true,
    },
    {
      id: 'cbb104cd-c5f7-4c7a-af5e-ef4ad1b428e0',
      propertyId: SOLAR_AVAILABILITY_KEY,
      key: SOLAR_AVAILABILITY_KEY,
      name: translations?.[SOLAR_AVAILABILITY_KEY] ?? 'Solar Availability',
      valueType: PropertyNodeValueType.String,
      allowedValues: translateAllowedValues(
        '> 16 hours,8-16 hours,< 8 hours,No availability,Unknown',
        translations
      ),
      remoteEditable: true,
    },
    {
      id: '633f4741-91ad-46a6-b302-8d1979eb3be4',
      propertyId: GAS_AVAILABILITY_KEY,
      key: GAS_AVAILABILITY_KEY,
      name: translations?.[GAS_AVAILABILITY_KEY] ?? 'Gas Availability',
      valueType: PropertyNodeValueType.String,
      allowedValues: translateAllowedValues(
        'No availability,Available,Irregular,Unknown',
        translations
      ),
      remoteEditable: true,
    },
    {
      id: 'a4338ad6-b6eb-46f0-bd8a-217f2820978d',
      propertyId: KEROSENE_AVAILABILITY_KEY,
      key: KEROSENE_AVAILABILITY_KEY,
      name:
        translations?.[KEROSENE_AVAILABILITY_KEY] ?? 'Kerosene Availability',
      valueType: PropertyNodeValueType.String,
      allowedValues: translateAllowedValues(
        'No availability,Available,Irregular,Unknown',
        translations
      ),
      remoteEditable: true,
    },
    {
      id: '86cb041d-96d3-40f1-874e-4189f4796790',
      propertyId: PENTA_3_KEY,
      key: PENTA_3_KEY,
      name: translations?.[PENTA_3_KEY] ?? 'Penta-3 Coverage',
      valueType: PropertyNodeValueType.String,
      allowedValues: translateAllowedValues(
        'High,Medium,Low,Unknown',
        translations
      ),
      remoteEditable: true,
    },
    {
      id: '9cc3ac59-061e-4e3f-af13-d2b6d9a52dea',
      propertyId: ZERO_DOSE_KEY,
      key: ZERO_DOSE_KEY,
      name: translations?.[ZERO_DOSE_KEY] ?? 'Zero Dose Coverage',
      valueType: PropertyNodeValueType.String,
      allowedValues: translateAllowedValues(
        'High,Medium,Low,Unknown',
        translations
      ),
      remoteEditable: true,
    },
  ];
}

export const gapsNameProperties: LocalisedNamePropertyConfig = {
  en: getGapsPropertiesForLanguage('en'),
  fr: getGapsPropertiesForLanguage('fr'),
};

export const populationNameProperties: LocalisedNamePropertyConfig = {
  en: [populationServed],
};
