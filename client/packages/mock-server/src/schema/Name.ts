import { Api } from '../api';
import { ListResponse, Name as NameType } from '../data/types';

const QueryResolvers = {
  names: (
    _: any,
    {
      page = { first: 100, offset: 0 },
      sort = [{ key: 'NAME', desc: false }],
    }: {
      page: { first: number; offset: number };
      sort: { key: string; desc: boolean }[];
    }
  ): ListResponse<NameType> => {
    return Api.ResolverService.list.name('customer', {
      first: page.first,
      offset: page.offset,
      desc: sort[0]?.desc ?? false,
      sort: sort[0]?.key ?? 'NAME',
    });
  },
};

export const Name = { QueryResolvers };
