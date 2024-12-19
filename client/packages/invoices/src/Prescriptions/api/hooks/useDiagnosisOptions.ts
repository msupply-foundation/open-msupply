import { DiagnosisNode, useQuery } from '@openmsupply-client/common';
import { usePrescriptionGraphQL } from '../usePrescriptionGraphQL';
import { DIAGNOSIS, LIST } from './keys';

export const useDiagnosisOptions = () => {
  const { prescriptionApi } = usePrescriptionGraphQL();

  const queryKey = [DIAGNOSIS, LIST, 'all'];

  const queryFn = async (): Promise<
    {
      label: string;
      value: string;
      id: string;
    }[]
  > => {
    const query = await prescriptionApi.activeDiagnoses({});
    const nodes = query?.allActiveDiagnoses;

    return nodes.map((node: DiagnosisNode) => ({
      label: node.description,
      value: node.id,
      id: node.id,
    }));
  };

  const { data, isLoading, isError } = useQuery({ queryKey, queryFn });

  return {
    query: { data, isLoading, isError },
  };
};
