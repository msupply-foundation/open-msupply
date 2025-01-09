import { useIntlUtils } from '@openmsupply-client/common';

export enum AppRoute {
  Android = 'android',

  Initialise = 'initialise',
  Login = 'login',
  Distribution = 'distribution',
  OutboundShipment = 'outbound-shipment',
  CustomerRequisition = 'customer-requisition',
  Customer = 'customers',
  Dispensary = 'dispensary',
  Patients = 'patients',
  Encounter = 'encounter',
  ContactTrace = 'contact-trace',
  VaccineCard = 'vaccine-card',
  Prescription = 'prescription',
  CustomerReturn = 'customer-return',

  Coldchain = 'cold-chain',
  Sensors = 'sensors',
  Monitoring = 'monitoring',
  Equipment = 'equipment',

  Discovery = 'discovery',

  Dashboard = 'dashboard',

  Replenishment = 'replenishment',
  InboundShipment = 'inbound-shipment',
  InternalOrder = 'internal-order',
  Suppliers = 'suppliers',
  SupplierReturn = 'supplier-return',

  Inventory = 'inventory',
  Stock = 'stock',
  Stocktakes = 'stocktakes',
  Locations = 'locations',
  MasterLists = 'master-lists',
  IndicatorsDemographics = 'indicators-demographics',
  Indicators = 'indicators',

  Manage = 'manage',
  Programs = 'programs',
  Facilities = 'facilities',

  Tools = 'tools',

  Reports = 'reports',

  Messages = 'messages',

  Settings = 'settings',

  Help = 'help',

  Logout = 'logout',

  Catalogue = 'catalogue',
  Items = 'items',
  Assets = 'assets',
  LogReasons = 'log-reasons',
  ImmunisationPrograms = 'immunisations',

  RnRForms = 'r-and-r-forms',

  PageNotFound = 'page-not-found',
}

export enum ExternalURL {
  // PublicDocs = 'https://docs.msupply.foundation/docs',
  PublicDocs,
}

export const useExternalUrl = (url: ExternalURL) => {
  const { currentLanguage } = useIntlUtils();
  // default to no language extension
  // only 'fr and 'es' are currently supported in public docs

  const baseUrl = 'https://docs.msupply.foundation';
  switch (url) {
    case ExternalURL.PublicDocs:
      switch (currentLanguage) {
        case 'es':
          return `${baseUrl}/es/docs`;
        case 'fr':
        case 'fr-DJ':
          return `${baseUrl}/fr/docs`;
        default:
          return `${baseUrl}/docs`;
      }
  }
};
