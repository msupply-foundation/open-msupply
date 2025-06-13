import { LocaleKey } from '@common/intl';
import { PrintFormat } from '@common/types';
import { AppRoute } from '@openmsupply-client/config';
import { Device } from '@capacitor/device';

export enum Platform {
  Android,
  Desktop,
  Web,
}

interface RouteMapping {
  title?: LocaleKey;
  docs: string;
}

const mapRoute = (route: string): RouteMapping => {
  const inRoute = (sub: string) => new RegExp(`/${sub}/|/${sub}\$`).test(route);
  switch (true) {
    case inRoute(AppRoute.Dashboard):
      return { title: 'dashboard', docs: '/getting_started/dashboard/' };
    case inRoute(AppRoute.Reports):
      return { title: 'reports', docs: '/getting_started/report/' };
    case inRoute(AppRoute.OutboundShipment):
      return {
        title: 'outbound-shipments',
        docs: '/distribution/outbound-shipments/',
      };
    case inRoute(AppRoute.CustomerRequisition):
      return {
        title: 'customer-requisition',
        docs: '/distribution/requisitions/',
      };
    case inRoute(AppRoute.Customer):
      return { title: 'customers', docs: '/distribution/customers/' };
    case inRoute(AppRoute.InboundShipment):
      return {
        title: 'inbound-shipment',
        docs: '/replenishment/inbound-shipments/',
      };
    case inRoute(AppRoute.SupplierReturn):
      return {
        title: 'supplier-return',
        docs: '/replenishment/supplier-returns',
      };
    case inRoute(AppRoute.CustomerReturn):
      return {
        title: 'customer-return',
        docs: '/distribution/customer-returns/',
      };
    case inRoute(AppRoute.InternalOrder):
      return {
        title: 'internal-order',
        docs: '/replenishment/internal-orders/',
      };
    case inRoute(AppRoute.Suppliers):
      return { title: 'suppliers', docs: '/replenishment/suppliers/' };
    case inRoute(AppRoute.Assets):
      return { title: 'assets', docs: '/catalogue/assets/' };
    case inRoute(AppRoute.Items):
      return { title: 'items', docs: '/catalogue/items/' };
    case inRoute(AppRoute.MasterLists):
      return { title: 'master-lists', docs: '/catalogue/master-list/' };
    case inRoute(AppRoute.Locations):
      return { title: 'locations', docs: '/inventory/locations/' };
    case inRoute(AppRoute.Stock):
      return { title: 'stock', docs: '/inventory/stock-view/' };
    case inRoute(AppRoute.Stocktakes):
      return { title: 'stocktakes', docs: '/inventory/stock-takes/' };
    case inRoute(AppRoute.Settings):
      return { title: 'settings', docs: '/settings/' };
    case inRoute(AppRoute.Patients):
      return { title: 'patients', docs: '/dispensary/patients/' };
    case inRoute(AppRoute.Prescription):
      return { title: 'prescriptions', docs: '/dispensary/prescriptions/' };
    case inRoute(AppRoute.Encounter):
      return {
        title: 'encounter',
        docs: '/programs/program-module/#encounter',
      };
    case inRoute(AppRoute.Clinicians):
      return {
        title: 'clinicians',
        docs: '/dispensary/clinicians/',
      };
    case inRoute(AppRoute.Monitoring):
      return {
        title: 'monitoring',
        docs: '/coldchain/monitoring/',
      };
    case inRoute(AppRoute.Sensors):
      return { title: 'sensors', docs: '/coldchain/sensors/' };
    case inRoute(AppRoute.Equipment):
      return { title: 'equipment', docs: '/coldchain/equipment/' };
    case inRoute(AppRoute.Stores):
      return { title: 'stores', docs: '/manage/facilities/' };
    case inRoute(AppRoute.IndicatorsDemographics):
      return {
        title: 'indicators-demographics',
        docs: '/manage/demographics/',
      };
    case inRoute(AppRoute.Campaigns):
      return { title: 'campaigns', docs: '/manage/campaigns/' };
    case inRoute(AppRoute.ImmunisationPrograms):
      return { title: 'immunisations', docs: '/programs/immunizations/' };
    case inRoute(AppRoute.RnRForms):
      return { title: 'r-and-r-forms', docs: '/replenishment/r-and-r-forms/' };
    default:
      return { title: undefined, docs: '/introduction/introduction' };
  }
};

const getPlatform = () => {
  // 'Mozilla/5.0 (Linux; Android 8.1.0; Lenovo TB-X304L Build/OPM1.171019.026; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/102.0.5005.78 Safari/537.36'
  const userAgent = navigator.userAgent.toLowerCase();
  switch (true) {
    case / android/i.test(userAgent):
      return Platform.Android;
    case / electron/i.test(userAgent):
      return Platform.Desktop;
    default:
      return Platform.Web;
  }
};

const getOS = () => {
  const userAgent = navigator.userAgent.toLowerCase();
  if (/win/i.test(userAgent)) {
    return 'Windows';
  }
  if (/mac/i.test(userAgent)) {
    return 'Mac OS';
  }
  if (/iphone|ipad|ipod/i.test(userAgent)) {
    return 'iOS';
  }
  if (/android/i.test(userAgent)) {
    return 'Android';
  }
  if (/linux/i.test(userAgent)) {
    return 'Linux';
  }
  // good to have a default
  return 'Windows';
};

// V7 of the Device plugin includes screen dimensions, so bundling it in here to
// emulate that functionality
const getDeviceInfo = async () => {
  const deviceInfo = await Device.getInfo();
  return {
    ...deviceInfo,
    screen: {
      width: window.innerWidth,
      height: window.innerHeight,
    },
  };
};

const platform = getPlatform();
const os = getOS();
const deviceInfo = getDeviceInfo();

const isTouchScreen = 'ontouchstart' in document.documentElement;

export const EnvUtils = {
  // Using isProduction rather than isDevelopment, as we also use a testing
  // environment while running jest, so easier to check !isProduction, generally.
  isProduction: (): boolean => process.env['NODE_ENV'] === 'production',
  isTouchScreen,
  mapRoute,
  os,
  deviceInfo,
  platform,
  printFormat: PrintFormat.Html, // platform === Platform.Android ? PrintFormat.Html : PrintFormat.Pdf,
};
