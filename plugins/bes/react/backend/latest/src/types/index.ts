// import { NameFilterInput, ItemFilterInput } from '../../codegenTypes';

export type EndpointItems = {
  universalCode: string;
  numberOfUnits: number;
};

export type IssueStockEndpointInput = {
  invoiceId?: string;
  customerCode: string;
  items: EndpointItems[];
};

export type IssueStockEndpointResponse = {
  success: boolean;
  message: string;
};

export type Graphql = {
  input: IssueStockEndpointInput;
  output: IssueStockEndpointResponse;
};
