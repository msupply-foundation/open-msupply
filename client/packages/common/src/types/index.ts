export type Item = {
  id: string;
  code: string;
  name: string;
  packSize?: number;
  quantity?: number;
};
export type Transaction = {
  id?: string;
  color: string;
  comment: string;
  status: string;
  type: string;
  entered: string;
  confirmed: string;
  invoiceNumber: string;
  total: string;
  name: string;
  items?: Item[];
};
