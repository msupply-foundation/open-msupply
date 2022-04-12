import { LocaleKey } from '@common/intl';
import { RegexUtils } from '@common/utils';

interface RouteMapping {
  title?: LocaleKey;
  docs: string;
}

const mapRoute = (route: string): RouteMapping => {
  switch (true) {
    case RegexUtils.includes('dashboard', route):
      return { title: 'dashboard', docs: '/dashboard/' };
    case RegexUtils.includes('outbound-shipment', route):
      return {
        title: 'outbound-shipments',
        docs: '/distribution/outbound-shipments/',
      };
    case RegexUtils.includes('customer-requisition', route):
      return {
        title: 'customer-requisition',
        docs: '/distribution/requisitions/',
      };
    case RegexUtils.includes('customers', route):
      return { title: 'customers', docs: '/distribution/customers/' };
    case RegexUtils.includes('inbound-shipment', route):
      return {
        title: 'inbound-shipments',
        docs: '/replenishment/inbound-shipments/',
      };
    case RegexUtils.includes('internal-order', route):
      return {
        title: 'internal-order',
        docs: '/replenishment/internal-orders/',
      };
    case RegexUtils.includes('suppliers', route):
      return { title: 'suppliers', docs: '/replenishment/suppliers/' };
    case RegexUtils.includes('items', route):
      return { title: 'items', docs: '/catalogue/items/' };
    case RegexUtils.includes('master-lists', route):
      return { title: 'master-lists', docs: '/catalogue/master-list/' };
    case RegexUtils.includes('locations', route):
      return { title: 'locations', docs: '/inventory/locations/' };
    case RegexUtils.includes('stocktakes', route):
      return { title: 'stocktakes', docs: '/inventory/stock-takes/' };
    // Stocktakes needs to go before stock so matching is correct
    case RegexUtils.includes('stock', route):
      return { title: 'stock', docs: '/inventory/stock-view/' };
    case RegexUtils.includes('sync', route):
      return { title: 'sync', docs: '/introduction/' };
    case RegexUtils.includes('admin', route):
      return { title: 'admin', docs: '/introduction/' };
    default:
      return { title: undefined, docs: '/introduction/' };
  }
};

export const EnvUtils = {
  // Using isProduction rather than isDevelopment, as we also use a testing
  // environment while running jest, so easier to check !isProduction, generally.
  isProduction: (): boolean => process.env['NODE_ENV'] === 'production',
  mapRoute,
};
