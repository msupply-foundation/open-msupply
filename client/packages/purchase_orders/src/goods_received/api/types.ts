export interface GoodsReceived {
  id: string;
  reference: string;
  status: string;
  createdDatetime: string;
  // Add more fields as needed
}

export interface ListParams {
  filter?: string;
  page?: number;
  pageSize?: number;
}
