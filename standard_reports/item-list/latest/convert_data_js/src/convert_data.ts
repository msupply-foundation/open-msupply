import { ConvertData } from '../convertDataType';
import { Arguments } from './generated-types/arguments';
import { ItemListQuery } from './generated-types/graphql';
import { sortNodes } from '../../../../utils';

export type Data = ItemListQuery;

type OutputNode = {
  id: string;
  code: string;
  name: string;
  venCategory: string;
  SOH: number;
  locationName: string;
  categoryName: string;
};

type Result = { items: { nodes: OutputNode[] } };

export const convert_data: ConvertData<Data, Arguments, Result> = ({
  data,
  arguments: { sort, dir, onlyOutOfStock, venCategory },
}) => {
  let output: OutputNode[] = data.items.nodes.map(item => ({
    id: item.id,
    code: item.code,
    name: item.name,
    venCategory: item.venCategory,
    SOH: item.stats?.stockOnHand ?? 0,
    locationName: item.itemStoreProperties?.defaultLocation?.code ?? '',
    categoryName:
      item.categories?.map(c => c.name).join(', ') ?? '',
  }));

  // Filter: Only out of stock
  if (onlyOutOfStock) {
    output = output.filter(item => item.SOH === 0);
  }

  // Filter: VEN category
  if (venCategory) {
    output = output.filter(item => {
      switch (venCategory) {
        case 'V':
          return item.venCategory === 'V';
        case 'E':
          return item.venCategory === 'E';
        case 'N':
          return item.venCategory === 'N';
        case 'V_OR_E':
          return item.venCategory === 'V' || item.venCategory === 'E';
        case 'V_E_N':
          return (
            item.venCategory === 'V' ||
            item.venCategory === 'E' ||
            item.venCategory === 'N'
          );
        case 'NONE':
          return (
            item.venCategory === 'NOT_ASSIGNED' ||
            item.venCategory === 'NotAssigned'
          );
        default:
          return true;
      }
    });
  }

  const sortedNodes = sortNodes(
    output,
    sort ?? 'name',
    dir ?? undefined
  );

  return { data: { items: { nodes: sortedNodes } } };
};
