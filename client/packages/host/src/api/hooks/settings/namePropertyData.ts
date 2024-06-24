import { SupportedLocales } from '@common/intl';
import {
  ConfigureNamePropertyInput,
  PropertyNodeValueType,
} from '@common/types';

export const gapsNameProperties: {
  en: ConfigureNamePropertyInput[];
} & Partial<Record<SupportedLocales, ConfigureNamePropertyInput[]>> = {
  en: [
    {
      id: '3285c231-ffc2-485b-9a86-5ccafed9a5c5',
      propertyId: 'supply_level',
      key: 'supply_level',
      name: 'Supply Level',
      valueType: PropertyNodeValueType.String,
      allowedValues: 'Primary,Sub-National,Lowest Distribution,Service Point',
      remoteEditable: false,
    },
    {
      id: '0e6fa1d3-4762-4b19-a832-1fe8a391e75b',
      propertyId: 'facility_type',
      key: 'facility_type',
      name: 'Facility Type',
      valueType: PropertyNodeValueType.String,
      allowedValues:
        'National Vaccine Store,Regional Vaccine Store,Referral Hospital,Municipal Warehouse,Maternal Clinic',
      remoteEditable: false,
    },
    {
      id: '098d1c23-1257-451a-a449-500ab3907337',
      propertyId: 'ownership_type',
      key: 'ownership_type',
      name: 'Ownership Type',
      valueType: PropertyNodeValueType.String,
      allowedValues: 'Government,NGO,Private,Faith-based',
      remoteEditable: false,
    },
    {
      id: '7716cecc-7d62-4f1b-93fa-a55a275079b4',
      propertyId: 'population_served',
      key: 'population_served',
      name: 'Population Served',
      valueType: PropertyNodeValueType.Float,
      allowedValues: null,
      remoteEditable: true,
    },
    {
      id: 'd700e86a-28c9-40a9-830c-f8a9793c63a0',
      propertyId: 'electricity_availability',
      key: 'electricity_availability',
      name: 'Electricity Availability',
      valueType: PropertyNodeValueType.String,
      allowedValues: '> 16 hours,8-16 hours,< 8 hours,No availability,Unknown',
      remoteEditable: true,
    },
    {
      id: 'cbb104cd-c5f7-4c7a-af5e-ef4ad1b428e0',
      propertyId: 'solar_availability',
      key: 'solar_availability',
      name: 'Solar Availability',
      valueType: PropertyNodeValueType.String,
      allowedValues: '> 16 hours,8-16 hours,< 8 hours,No availability,Unknown',
      remoteEditable: true,
    },
    {
      id: '633f4741-91ad-46a6-b302-8d1979eb3be4',
      propertyId: 'gas_availability',
      key: 'gas_availability',
      name: 'Gas Availability',
      valueType: PropertyNodeValueType.String,
      allowedValues: 'No availability,Available,Irregular,Unknown',
      remoteEditable: true,
    },
    {
      id: 'a4338ad6-b6eb-46f0-bd8a-217f2820978d',
      propertyId: 'kerosene_availability',
      key: 'kerosene_availability',
      name: 'Kerosene Availability',
      valueType: PropertyNodeValueType.String,
      allowedValues: 'No availability,Available,Irregular,Unknown',
      remoteEditable: true,
    },
    {
      id: 'd4d252eb-40c6-491c-bd2a-65c74534b966',
      propertyId: 'supply_interval',
      key: 'supply_interval',
      name: 'Supply Interval (Months between deliveries)',
      valueType: PropertyNodeValueType.Integer,
      allowedValues: null,
      remoteEditable: true,
    },
  ],
};
