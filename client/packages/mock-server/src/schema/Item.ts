import {
  ItemSortFieldInput,
  ItemFilterInput,
} from '@openmsupply-client/common/src/types/schema';
import { Api } from '../api';
import { ListResponse, Item as ItemType } from '../data/types';

const QueryResolvers = {
  items: (
    _: any,
    vars: {
      page?: { first?: number; offset?: number };
      sort: [{ key: ItemSortFieldInput; desc: boolean }];
      filter: ItemFilterInput;
    }
  ): ListResponse<ItemType> => {
    return Api.ResolverService.list.item({
      first: vars?.page?.first ?? 20,
      offset: vars?.page?.offset ?? 0,
      desc: vars.sort[0]?.desc ?? false,
      key: vars.sort[0]?.key ?? ItemSortFieldInput.Name,
      filter: vars.filter,
    });
  },
};

export const Item = { QueryResolvers };
