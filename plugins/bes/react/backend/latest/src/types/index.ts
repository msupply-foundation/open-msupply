import { NameFilterInput, ItemFilterInput } from '../../codegenTypes';

export type IssueStockEndpointInput = {
  customerFilter: NameFilterInput;
  itemFilter: ItemFilterInput;
  quantity: number;
};

export type IssueStockEndpointResponse = {
  success: boolean;
  message: string;
};

export type Graphql = {
  input: IssueStockEndpointInput;
  output: IssueStockEndpointResponse;
};
