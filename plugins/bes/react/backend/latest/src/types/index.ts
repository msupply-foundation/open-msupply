// import { NameFilterInput, ItemFilterInput } from '../../codegenTypes';

export type EndpointItems = {
  itemCode: string;
  numberOfUnits: number;
};

export type IssueStockEndpointInput = {
  invoiceId?: string;
  customerCode: string;
  items: EndpointItems[];
};

export type ItemsEndpointResponse = {
  itemCode: string;
  success: boolean;
  message: string;
};

export type IssueStockEndpointResponse = {
  success: boolean;
  message: string;
  items: ItemsEndpointResponse[];
};

export type Graphql = {
  input: IssueStockEndpointInput;
  output: IssueStockEndpointResponse;
};
