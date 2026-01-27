/* eslint-disable camelcase */
import { BackendPlugins } from '@common/types';
import { IssueStockEndpointInput, IssueStockEndpointResponse } from './types';
import namesQueryText from './graphql-texts/customer.graphql';
import itemsQueryText from './graphql-texts/items.graphql';
import {
  ItemsQuery,
  ItemsQueryVariables,
  NamesQuery,
  NamesQueryVariables,
} from './generated-types/graphql';

const customerQuery = (variables: NamesQueryVariables): NamesQuery => {
  return use_graphql({ query: namesQueryText, variables }) as NamesQuery;
};

const itemsQuery = (variables: ItemsQueryVariables): ItemsQuery => {
  return use_graphql({ query: itemsQueryText, variables }) as ItemsQuery;
};

type Graphql = {
  input: IssueStockEndpointInput;
  output: IssueStockEndpointResponse;
};

const plugins: BackendPlugins = {
  graphql_query: ({ store_id, input }): Graphql['output'] => {
    const inp = input as Graphql['input'];

    log({ t: 'Message', storeId: store_id });

    const { stores: activeStores } = get_active_stores_on_site();

    log({ t: 'Customer Id', activeStores: activeStores[0] });

    if (
      !activeStores ||
      activeStores.length < 1 ||
      activeStores.at(0)?.store_row.is_disabled
    ) {
      return { success: true, message: 'No active stores found' };
    }

    const customerId = activeStores[0].store_row.id;

    log({ t: 'Customer Id', customerId });

    const customerQueryResult = customerQuery({
      storeId: store_id,
      filter: inp.customerFilter,
    });

    if (!customerQueryResult || customerQueryResult.names.nodes.length < 1) {
      return {
        success: true,
        message: `No customer found for filter: ${inp.customerFilter}`,
      };
    }

    const itemsQueryResult = itemsQuery({
      storeId: store_id,
      filter: inp.itemFilter,
    });

    if (!itemsQueryResult || itemsQueryResult.items.totalCount < 1) {
      return {
        success: true,
        message: `No items found for items filter: ${inp.itemFilter}`,
      };
    }

    const itemId = itemsQueryResult.items.nodes[0].id;

    log({ t: 'item id', itemId });

    return {
      success: true,
      message:
        'I think this has worked! ' +
        inp.quantity +
        '   ' +
        inp.customerFilter +
        '   ' +
        inp.itemFilter,
    };
  },
};

export { plugins };
