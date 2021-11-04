import { NameSortFieldInput } from '@openmsupply-client/common/src/types/schema';
import { Api } from '../api';
import { ListResponse, Name as NameType } from '../data/types';

const QueryResolvers = {
  items: (
    _: any,
    vars: {
      page?: { first?: number; offset?: number };
      sort: [{ key: NameSortFieldInput; desc: boolean }];
    }
  ): ListResponse<NameType> => {
    return Api.ResolverService.list.name({
      first: vars?.page?.first,
      offset: vars?.page?.offset,
      desc: vars?.sort[0]?.desc ?? false,
      key: vars?.sort[0]?.key ?? NameSortFieldInput.Name,
    });
  },
};

export const Name = { QueryResolvers };
