import {
  useIntlUtils,
  useNotification,
  useQuery,
  useTranslation,
} from '@openmsupply-client/common';
import { ReportRowFragment } from '../operations.generated';
import { useReportGraphQL } from '../useReportGraphQL';
import { REPORT } from './keys';

export const useReport = (id: string) => {
  const { reportApi, storeId } = useReportGraphQL();
  const { currentLanguage: language } = useIntlUtils();
  const { error } = useNotification();
  const t = useTranslation();

  const queryKey = [REPORT, storeId, id];
  const queryFn = async (): Promise<ReportRowFragment> => {
    const result = await reportApi.report({
      storeId,
      userLanguage: language,
      id,
    });

    if (result.report.__typename == 'ReportNode') {
      return result.report;
    } else {
      error(t('report.error-translating'))();
      throw new Error('Could not translate report');
    }
  };

  return useQuery({
    queryKey,
    queryFn,
  });
};
