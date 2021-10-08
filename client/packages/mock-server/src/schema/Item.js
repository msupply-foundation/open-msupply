import { Api } from '../api';

const Types = `
type Item {
    id: String
    name: String
    code: String
    availableQuantity: Int
}
`;

const Queries = `
    items: [Item]
`;

const QueryResolvers = {
  items: () => {
    return Api.ResolverService.list.item();
  },
};

export const Item = { Types, Queries, QueryResolvers };
