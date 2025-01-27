import {
  useIntlUtils,
  useNotification,
  useQuery,
  useTranslation,
} from '@openmsupply-client/common';
import { useReportGraphQL } from '../useReportGraphQL';
import { REPORT } from './keys';

export const useReport = (id: string) => {
  const { reportApi, storeId } = useReportGraphQL();
  const { currentLanguage: language } = useIntlUtils();
  const { error } = useNotification();
  const t = useTranslation();

  const queryKey = [REPORT, storeId, id];
  const queryFn = async () => {
    try {
      const result = await reportApi.report({
        storeId,
        userLanguage: language,
        id,
      });

      let report = result.report;

      if (report.__typename === 'ReportNode') {
        return report;
      }

      if (report.__typename === 'QueryReportError') {
        let errorMessage;
        switch (report.error.__typename) {
          case 'FailedTranslation':
            errorMessage = t('report.error-translating', {
              key: report.error.description,
            });
            break;
          // TODO add never exhaustive error handling if adding more error types to QueryReportError
          // default:
          //   noOtherVariants(report.error);
        }
        error(errorMessage)();
        console.error(errorMessage);
      }
    } catch (e) {
      console.error(e);
    }
  };
  return useQuery({
    queryKey,
    queryFn,
  });
};
