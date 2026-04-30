import {
    useAuthContext,
    useGql,
    useQueryClient,
} from '@openmsupply-client/common';
import { getSdk } from './operations.generated';

export const useInboundGraphQL = () => {
    const { client } = useGql();
    const queryClient = useQueryClient();
    const { storeId } = useAuthContext();
    const inboundApi = getSdk(client);

    return { inboundApi, queryClient, storeId };
};
