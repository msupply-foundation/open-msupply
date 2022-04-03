import { useTranslation } from '@common/intl';
import { RegexUtils } from '@common/utils';

export const useGetPageTitle = () => {
  const t = useTranslation('app');

  const mapRouteToTitle = (route: string) => {
    switch (true) {
      case RegexUtils.includes('dashboard', route):
        return t('dashboard');
      case RegexUtils.includes('outbound-shipment', route):
        return t('outbound-shipments');
      case RegexUtils.includes('customer-requisition', route):
        return t('customer-requisition');
      case RegexUtils.includes('customers', route):
        return t('customers');
      case RegexUtils.includes('inbound-shipment', route):
        return t('inbound-shipments');
      case RegexUtils.includes('internal-order', route):
        return t('internal-order');
      case RegexUtils.includes('suppliers', route):
        return t('suppliers');
      case RegexUtils.includes('items', route):
        return t('items');
      case RegexUtils.includes('master-lists', route):
        return t('master-lists');
      case RegexUtils.includes('locations', route):
        return t('locations');
      case RegexUtils.includes('stocktakes', route):
        return t('stocktakes');
      // Stocktakes needs to go before stock so matching is correct
      case RegexUtils.includes('stock', route):
        return t('stock');
      case RegexUtils.includes('sync', route):
        return t('sync');
      case RegexUtils.includes('admin', route):
        return t('admin');
      default:
        return '';
    }
  };

  const getPageTitle = (route: string) => {
    return `${mapRouteToTitle(route)} | ${t('app')} `;
  };
  return getPageTitle;
};
