import {
  UpdateRequisitionInput,
  InsertRequisitionInput,
  DeleteRequisitionInput,
} from './../../../common/src/types/schema';
import { MutationService } from '../api/mutations';
import { ResolverService } from './../api/resolvers';

const QueryResolvers = {
  requisition: (id: string) => {
    return ResolverService.requisition.get.byId(id);
  },
  requisitions: () => {
    return ResolverService.requisition.get.list();
  },
};

const MutationResolvers = {
  updateRequisition: (_: any, { input }: { input: UpdateRequisitionInput }) => {
    return {
      __typename: 'RequisitionNode',
      ...MutationService.requisition.update(input),
    };
  },
  insertRequisition: (_: any, { input }: { input: InsertRequisitionInput }) => {
    return {
      __typename: 'RequisitionNode',
      ...MutationService.requisition.insert(input),
    };
  },
  deleteRequisition: (_: any, { input }: { input: DeleteRequisitionInput }) => {
    return {
      __typename: 'DeleteResponse',
      ...MutationService.requisition.delete(input),
    };
  },
};

export const Requisition = {
  QueryResolvers,
  MutationResolvers,
};
