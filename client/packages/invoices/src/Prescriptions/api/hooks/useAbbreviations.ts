import { AbbreviationNode, useGql, useQuery } from '@openmsupply-client/common';
import { getSdk } from '../../api/operations.generated';
import { ABBREVIATION } from './keys';
export const useAbbreviationsGraphQl = () => {
  const { client } = useGql();
  const abbreviationApi = getSdk(client);

  return { abbreviationApi };
};

export const useAbbreviations = () => {
  const { abbreviationApi } = useAbbreviationsGraphQl();

  const queryKey = [ABBREVIATION];

  const queryFn = async (): Promise<AbbreviationNode[]> => {
    const result = await abbreviationApi.abbreviations({});
    return result.abbreviations;
  };

  const query = useQuery({ queryKey, queryFn });
  return query;
};
