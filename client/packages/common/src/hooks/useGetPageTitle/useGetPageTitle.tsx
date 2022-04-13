import { useTranslation } from '@common/intl';
import { EnvUtils } from '@common/utils';

export const useGetPageTitle = () => {
  const t = useTranslation('app');
  const getPageTitle = (route: string) => {
    const mappedRoute = EnvUtils.mapRoute(route);
    return mappedRoute.title
      ? `${t(mappedRoute.title)} | ${t('app')} `
      : t('app');
  };

  return getPageTitle;
};
