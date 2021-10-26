import { Api } from '../api';
import { ListResponse, Item as ItemType } from '../data/types';

const QueryResolvers = {
  items: (
    _: any,
    {
      page = { first: 100, offset: 0 },
      sort = [{ key: 'NAME', desc: false }],
    }: {
      page: { first: number; offset: number };
      sort: { key: string; desc: boolean }[];
    }
  ): ListResponse<ItemType> => {
    return Api.ResolverService.list.item({
      first: page.first,
      offset: page.offset,
      desc: sort[0]?.desc ?? false,
      sort: sort[0]?.key ?? 'NAME',
    });
  },
};

export const Item = { QueryResolvers };
