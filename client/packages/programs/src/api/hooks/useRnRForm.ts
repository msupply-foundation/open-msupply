import { useQuery } from '@openmsupply-client/common';
import { RnRFormFragment, RnRFormLineFragment } from '../operations.generated';
import { useProgramsGraphQL } from '../useProgramsGraphQL';
import { RNR_FORM } from './keys';

export interface RnRForm extends RnRFormFragment {
  lines: RnRFormLineFragment[];
}

export const useRnRForm = ({ rnrFormId }: { rnrFormId: string }) => {
  const { api, storeId } = useProgramsGraphQL();
  const queryKey = [RNR_FORM, rnrFormId];

  const queryFn = async (): Promise<RnRForm | null> => {
    const query = await api.rAndRFormDetail({
      storeId,
      rnrFormId,
    });

    const result = query?.rAndRForm;
    return result.__typename === 'RnRFormNode' ? result : null;
  };

  const query = useQuery({ queryKey, queryFn });
  return query;
};
