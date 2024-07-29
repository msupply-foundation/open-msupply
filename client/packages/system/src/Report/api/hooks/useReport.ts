import { useQuery } from '@openmsupply-client/common';
import { ReportRowFragment } from '../operations.generated';
import { useReportGraphQL } from '../useReportGraphQL';
import { REPORT } from './keys';

export const useReport = (id: string) => {
  const { reportApi, storeId } = useReportGraphQL();

  const queryKey = [REPORT, storeId, id];
  const queryFn = async (): Promise<ReportRowFragment> => {
    const result = await reportApi.report({
      storeId,
      id,
    });

    return result.report;
  };

  return useQuery({
    queryKey,
    queryFn,
  });
};
